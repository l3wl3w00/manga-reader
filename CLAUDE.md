# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

An Angular 22 manga reader app. Build with `ng build` and open `dist/manga-reader/browser/index.html` directly in a browser (no dev server needed — `baseHref` is set to `./`).

## Development

```bash
ng build              # production build → dist/manga-reader/browser/
ng build --watch --configuration development  # watch mode
ng serve              # dev server on localhost
npm run build:single  # one self-contained file → dist/manga-reader.html (scripts/inline.mjs; Google Fonts stay a link)
```

Install with `npm ci`.

Default image source: `https://images.mangafreak.me/mangas/{manga}/{manga}_{ch}/{manga}_{ch}_{pg}.jpg`, loaded with
`referrerpolicy="no-referrer"`. The page image, search and chapter-link URLs are templates the user can change in
Settings > Source: every URL goes through `SourceService`, never built by hand.

## Architecture

Design: "Ink & Screentone" (dark manga-print brutalism). Tokens are Tailwind 4 `@theme` variables in `src/styles.css`
(`bg-ink`, `text-paper`, `border-line`, `bg-shu`, `text-gold`, `font-display`, `shadow-hard`, `ease-spring`...; the
stock Tailwind palette is switched off). `styles.css` also holds the design-system primitives (`.btn`, `.ib`, `.inp`,
`.stp`, `.tgl`, `.key`, `.tag`, `.tab`, `.pnl`, `.nav-btn`), the `halftone`/`hatch` textures, every keyframe and
`a-*` motion class used by `animate.enter`/`animate.leave`, the View Transition fade for jumps, and the
reduced-motion fallbacks under `html[data-motion="reduced"]` (never `@media (prefers-reduced-motion)`: `MotionService`
decides, so the in-app setting can override the system), the page-strip rules (`.strip`, `.slot`, `.veil`, `.nb-*`)
and the backdrop rules (`.bd`, `.bd-drift`). Fonts come from Google Fonts (`src/index.html`); icons are Lucide
(`@lucide/angular`'s `LucideDynamicIcon`: `<svg [lucideIcon]="icons.x" />`; the icon data comes from `lucide` and
is listed in `ui/icons.ts`, because `@lucide/angular`'s per-icon components bloat the bundle by ~3 kB each). Overlays whose host is removed by the parent (sheets, settings, end card)
put `animate.leave: 'x-leave'` on the host and `data-leave` on their parts.

**Layout**: `LayoutService.mobile` (below 768 px, or a coarse pointer; same query as the `mobile:` variant) picks
`DesktopLayoutComponent` or `MobileLayoutComponent` in `App`.

**Services** (`src/app/services/`):
- `ReaderService` — state signals (`manga`, `chapter`, `page`, `totalPages`, `busy`, `screen`, `imgSrc`, `lastGood`,
  `missed`), `load()` (returns whether a turn started), navigation. Probes image URLs with `Image` objects; `onerror` =
  404. A page `PreloadService` already holds shows at once (no probe). Screens: `welcome`, `loading` (after 180 ms; at
  once for a strip turn onto a page still loading: its skeleton slides in, then it `arrive`s), `image`, `end` (a 404
  right after the chapter's last page, see `classifyMiss`), `not-found` (page 1, a missing chapter or a misspelt
  manga). After each page it fetches the neighbours ahead (`preloadAround`, `probeNext`: a 404 there is the chapter's
  length; at a known last page the next chapter's page 1). Captions and counters read `shown` and `shownTotal` (the
  page on screen and its chapter's length), so they change with the page, not before it. Page addresses come from
  `SourceService.pageUrl`; when the page template changes, the page on screen keeps its address (`imgSrc`, also in the
  strip) and the neighbours are fetched again from the new one, without probing (a 404 there must not shorten the
  chapter). `buildUrl` (`source.ts`) is the default template, for tests.
- `PageTurnService` — runs a page change: `next`/`prev`/`arrive` through the page strip's animator (the reader
  registers it with `attach`: `before`, update, `after`; `settle` ends a running turn at once), `jump` in a View
  Transition fade (`data-turn` on `<html>`), `none` instantly.
- `PreloadService` — decoded pages fetched ahead (the strip's neighbours and the page on screen), at most 10, and the
  addresses that 404'd ahead (`missing`: a next chapter that is not out yet).
- `StripService` — the page strip: `prev` / `next` slots (decisions in `strip/strip.ts`: page, skeleton, teaser,
  empty), placed `items` (offset, page rect and `box`: the current page's frame or the neighbour's page; a page leaving
  during a turn too), the turn's `ghostKey` /
  `leaving`, and the mobile swipe (`drag`, `release`, `cancel`, `dragX`, `armedKey`; decisions in
  `gestures/gestures.ts`: `swipeSnap`, `isArmed`, `dragOffset`).
- `AppearanceService` — backdrop (`solid` with Ink…Slate or a custom colour; `drift` with Dusk/Tide/Ember/Moss or
  custom colours; custom colours go through `clampDark`, so the page always stands out) and the neighbour pages'
  see-through (`opaque`, `25`, `50`).
- `LibraryService` — localStorage library (`manga-reader-library`), per-chapter page positions, favourites,
  `listing` (Favourites / Recent), `relativeTime`, `normalizeEntry` (tolerates old entries without `updatedAt`).
- `ZoomService` + `zoom-math.ts` — the current page zooms and pans inside a frame (its strip slot): at 100% the frame
  is the page; zooming grows it (`frameAt`) up to `maxW` (`maxFrameWidth`), which keeps `DESKTOP_NEIGHBOUR_MIN` (72 px)
  of each neighbour on screen on desktop (from the rail's edge while the panels are locked) and the 14 px slivers on
  mobile (where the frame only grows taller), except on a phone with auto-fit on: there the frame may take the full
  window width, so auto-fit zooms a portrait page in and the slivers go off screen (owner's choice). Pan clamps to the frame (`clampPan`); zoom toward a point
  (`zoomAround`), drag, pinch, auto-fit (`fitView`: max width % also capped by the frame), minimap region
  (`visibleRegion`: the part of the page in the frame). Coordinates are the strip's: pointer positions have
  `railOffset` taken off. `inset`: on mobile the page sits 20 px in from each side at 100%. `railOffset`
  (`clearRailOffset`): with the panels locked the strip re-centres right of the rail, at any zoom. ZoomService reads
  `UiService` lazily (through `Injector`): UiService reaches it through ReaderService.
- `KeybindingsService` — presets, renaming, recording (`recordKey`), `actionFor` (match order `ACTION_PRIORITY`),
  `conflicts` (`findConflicts`, same order), `basePreset`.
- `SourceService` + `source.ts` — the three URL templates in use (`templates`: page images, search link, chapter
  link; `manga-reader-source`), `pageUrl` (the reader, preload, strip, covers), `searchUrl`, `chapterUrl`, and
  `searchSite` / `chapterSite` (how buttons name the site: MangaFreak, a short host, or "the site"; null when the link
  is emptied, which hides its buttons everywhere). Field `drafts` and `commit`: only a valid template is ever saved or
  used (`refused` marks "Not saved"). `source.ts` holds the rules (`checkTemplate`: page images need http(s), `{ch}`
  and `{pg}`, a missing `{manga}` only warns; search needs `{query}`, URL-encoded), the one-tap fixes, substitution
  (`resolveParts` marks the values; the chapter link's `{manga}` is Title_Cased like MangaFreak's chapter pages) and
  the Test probe (`probeImage`: one "Couldn't load" for a 404 or a blocked host).
- `UiService` — `panelsLocked` / `peeking` / `showPanels`, `settingsOpen`, mobile `sheet` ('jump' | 'library').
- `LayoutService` — `mobile`, `finePointer` media signals, `viewport` size.
- `MotionService` — Motion setting (`system` / `full` / `reduced`), sets `data-motion` on `<html>`. Chrome on Linux
  reports reduced motion whenever the desktop's animations are off (KDE at "Instant"), hence the override.

**Components** (`src/app/components/`, shared or desktop):
- `ReaderComponent` — the page strip (`.vt-page`): pages in one line, only the current one sharp and interactive (zoom
  and pan apply to it alone). **No spoilers:** a neighbour shows overall tone only. `TinyPageDirective`
  (`ui/tiny-page.directive.ts`) draws it from a copy 20 px wide (about 1/32), blurred by an eighth of the page, its
  luminance squeezed into a narrow band toward grey and darkened, scaled up under an ink wash and halftone screen
  (`.veil`). Nothing lifts that on hover (only the hint and an outline show). Check any change to it with the
  review driver's stress page (`tmp/strip-review/tools/cdp.mjs`: Kaiju Postal Service pages carry a face, a "NO!"
  balloon and a huge page number) at 2x and squinted. Slots: the next one after the last page is a next-chapter
  teaser (or an inert "No chapter N yet" once its page 1 404'd ahead); the one before page 1 is the previous
  chapter's last page or empty (both inert: clicks on them do nothing); a page still loading is the screentone
  skeleton. Teaser and loading card take a narrow form when under 150 px of them shows. Runs the turn: strip slides
  320 ms; outgoing page obscures in 80 ms; the incoming page shows the same tone-only drawing until 55%, then
  crossfades to the real page (never a blurred full image); captions and counters stay on the outgoing page until
  then (`ReaderService.captionHold`); reduced motion: jump + 120 ms fade; a new turn jumps a running one to its end.
  Desktop: clicking a neighbour turns the page (page only; the teaser goes to the next chapter) with a hover hint in
  its visible part; clicking the page locks or unlocks the panels; wheel zoom and drag-pan. A click only counts where
  the press began and if the mouse stayed put: a pan, or a press on a neighbour let go elsewhere, does nothing.
  Zoomed in, the neighbours stay in view beside the frame (they move out as it grows) and stay clickable; their hover
  hint shrinks to a chevron when only a strip of them shows.
- `ControlPanelComponent` (header with the pin) + `JumpFormComponent` (manga/chapter/page; also the mobile welcome
  form and Jump sheet), `LibraryPanelComponent` + `LibraryEntryComponent`, `BottomBarComponent`.
- `HudComponent` — folio, key hints, `ZoomChipComponent`, `MinimapComponent`, zoom hints, progress rule. The caption
  and key hints only show when they fit the dark gutter beside the page (`hud/gutter-fit.ts`). Below 1280 px with the
  panels up, the zoom chip sits in the rail instead. Zoomed in, the minimap, zoom chip and pan hint sit 16 px inside
  the page's frame (`inFrame`), never over a neighbour strip; with the bottom bar up the chip sits above it. The
  desktop bottom bar centres on the page (its frame when zoomed), kept clear of the rail and the window edge.
- `WelcomeComponent`, `NotFoundComponent`, `LoadingCardComponent`, `EndOfChapterComponent` (both layouts).
- `SettingsComponent` — dialog (desktop: Keybindings / Zoom / Appearance / Source) or full screen (mobile: Controls /
  Zoom / Appearance / Source) with `KeybindingsTabComponent`, `ZoomTabComponent`, `AppearanceTabComponent` (backdrop,
  neighbour pages, live preview, and `MotionTabComponent` as its Motion section), `ControlsTabComponent` (mobile: the
  gestures, and a Keybindings row opening `KeybindingsTabComponent` when a fine pointer exists), `SourceTabComponent`
  (the URL templates: a field saves on blur or Enter when valid, else shows "Not saved"; placeholder chips insert at
  the caret; one-tap fixes; live "resolves to" preview; Test loads the resolved page).
  It is modal: the layouts make everything else `inert` while it is open, Tab wraps inside it (`ui/focus-trap.ts`),
  focus starts on the active tab and returns to the opener.

- `BackdropComponent` (`ui/backdrop/`) — behind everything (in `App`): nothing for Ink (the dotted ground), a flat
  colour, or Drift (two pseudo-element dot fields on a 90 s loop, still under reduced motion). Panels stay ink.

**Mobile** (`src/app/mobile/`): `GestureLayerComponent` (a tap anywhere shows or hides the controls and never turns
the page; a sideways swipe at 100% drags the strip and snaps past 40% of a page or on a flick, else springs back;
double-tap, long-press peek, pinch, pan; decisions in `gestures/gestures.ts`), `SwipeCueComponent` (mid-swipe cue), `MobileTopBarComponent`, `MobileNavComponent` + `PageScrubberComponent`,
`MobileHeaderComponent`, `LibrarySheetComponent` (swipe rows, remove sheet). `ui/` holds `SheetComponent` (bottom
sheet, drag to dismiss), `CoverComponent`, `PageArtComponent`.

**Two navigation modes** (preserved from original):
- Neighbour clicks and swipes: page-only, never cross a chapter (a swipe past the last page: the end-of-chapter card).
  The one exception: clicking the next-chapter teaser after the last page.
- Buttons and keybindings: advance chapter at chapter boundaries.

**Persistence** (all `localStorage`):
- `manga-reader-library`: full library with per-chapter page positions, favourites, chapter lengths, `updatedAt`.
- `manga-reader-last`: last opened manga/chapter/page for auto-resume on load.
- `manga-reader-bindings`: customisable key bindings.
- `manga-reader-preset`, `manga-reader-preset-names`: active preset + renamed labels.
- `manga-reader-autozoom`, `manga-reader-fitzoom`: auto-fit zoom toggle + settings.
- `manga-reader-motion`: `'full'` or `'reduced'`; absent = follow the system.
- `manga-reader-pan-hint-dismissed`: `'1'` once the "drag to pan" hint shown while zoomed was closed.
- `manga-reader-backdrop`: JSON `{ mode, solid, solidCustom, drift, driftCustom }` (see `normalizeBackdrop`); absent =
  Solid Ink.
- `manga-reader-neighbours`: `'25'` or `'50'` (% of backdrop through the hidden neighbours); absent = opaque.
- `manga-reader-source`: JSON with the URL templates that differ from the defaults (`image`, `search`, `chapter`;
  `""` turns a link off); absent = the defaults; an invalid entry falls back to its default (`normalizeSource`).

**Keybinding presets**: Default, WASD, Eating — stored in `KeybindingsService.PRESETS`.

**Tests**: `ng test` (vitest, jsdom). `src/test-setup.ts` swaps in an in-memory `localStorage`, because Node 25's own
one shadows jsdom's, and stubs canvas `getContext` (jsdom has none). jsdom has no `PointerEvent`: the gesture spec
dispatches mouse events carrying a `pointerId`.
