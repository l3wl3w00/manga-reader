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

Install with `npm ci --legacy-peer-deps`: `lucide-angular` 1.0.0 (the latest) declares peers only up to Angular 21.

External image source: `https://images.mangafreak.me/mangas/{manga}/{manga}_{ch}/{manga}_{ch}_{pg}.jpg` with `referrerpolicy="no-referrer"`.

## Architecture

Design: "Ink & Screentone" (dark manga-print brutalism). Tokens are Tailwind 4 `@theme` variables in `src/styles.css`
(`bg-ink`, `text-paper`, `border-line`, `bg-shu`, `text-gold`, `font-display`, `shadow-hard`, `ease-spring`...; the
stock Tailwind palette is switched off). `styles.css` also holds the design-system primitives (`.btn`, `.ib`, `.inp`,
`.stp`, `.tgl`, `.key`, `.tag`, `.tab`, `.pnl`, `.nav-btn`), the `halftone`/`hatch` textures, every keyframe and
`a-*` motion class used by `animate.enter`/`animate.leave`, the View Transition page-turn rules, and the
reduced-motion fallbacks under `html[data-motion="reduced"]` (never `@media (prefers-reduced-motion)`: `MotionService`
decides, so the in-app setting can override the system). Fonts come from Google Fonts (`src/index.html`); icons are Lucide
(`lucide-angular`, listed in `ui/icons.ts`). Overlays whose host is removed by the parent (sheets, settings, end card)
put `animate.leave: 'x-leave'` on the host and `data-leave` on their parts.

**Layout**: `LayoutService.mobile` (below 768 px, or a coarse pointer; same query as the `mobile:` variant) picks
`DesktopLayoutComponent` or `MobileLayoutComponent` in `App`.

**Services** (`src/app/services/`):
- `ReaderService` — state signals (`manga`, `chapter`, `page`, `totalPages`, `busy`, `screen`, `imgSrc`, `lastGood`,
  `missed`), `load()`, navigation. Probes image URLs with `Image` objects; `onerror` = 404. Screens: `welcome`,
  `loading` (only after 180 ms), `image`, `end` (a 404 right after the chapter's last page, see `classifyMiss`),
  `not-found` (page 1, a missing chapter or a misspelt manga). Page turns run through `PageTurnService`.
  Captions and counters read `shown` (the page on screen), so they change with the image, not before it.
- `PageTurnService` — wraps a page change in `document.startViewTransition` with a direction (`data-turn` on
  `<html>`); instant swap where unsupported.
- `LibraryService` — localStorage library (`manga-reader-library`), per-chapter page positions, favourites,
  `listing` (Favourites / Recent), `relativeTime`, `normalizeEntry` (tolerates old entries without `updatedAt`).
- `ZoomService` + `zoom-math.ts` — zoom/pan signals, zoom toward a point, drag, pinch, auto-fit (`fitView`), minimap
  region (`visibleRegion`).
- `KeybindingsService` — presets, renaming, recording (`recordKey`), `actionFor` (match order `ACTION_PRIORITY`),
  `conflicts` (`findConflicts`, same order), `basePreset`.
- `UiService` — `panelsLocked` / `peeking` / `showPanels`, `settingsOpen`, mobile `sheet` ('jump' | 'library').
- `LayoutService` — `mobile`, `finePointer` media signals, `viewport` size.
- `MotionService` — Motion setting (`system` / `full` / `reduced`), sets `data-motion` on `<html>`. Chrome on Linux
  reports reduced motion whenever the desktop's animations are off (KDE at "Instant"), hence the override.

**Components** (`src/app/components/`, shared or desktop):
- `ReaderComponent` — page image in the zoom root (`.vt-page`), skeleton while loading; desktop wheel zoom and drag-pan.
- `ClickZonesComponent` — desktop 28/44/28 zones with hover hints.
- `ControlPanelComponent` (header with the pin) + `JumpFormComponent` (manga/chapter/page; also the mobile welcome
  form and Jump sheet), `LibraryPanelComponent` + `LibraryEntryComponent`, `BottomBarComponent`.
- `HudComponent` — folio, key hints, `ZoomChipComponent`, `MinimapComponent`, zoom hints, progress rule. The caption
  and key hints only show when they fit the dark gutter beside the page (`hud/gutter-fit.ts`). Below 1280 px with the
  panels up, the zoom chip sits in the rail instead.
- `WelcomeComponent`, `NotFoundComponent`, `LoadingCardComponent`, `EndOfChapterComponent` (both layouts).
- `SettingsComponent` — dialog (desktop) or full screen (mobile) with `KeybindingsTabComponent`, `ZoomTabComponent`,
  `MotionTabComponent`, `GesturesTabComponent` (mobile; Keybindings shows there too when a fine pointer exists).
  It is modal: the layouts make everything else `inert` while it is open, Tab wraps inside it (`ui/focus-trap.ts`),
  focus starts on the active tab and returns to the opener.

**Mobile** (`src/app/mobile/`): `GestureLayerComponent` (tap zones, swipes, double-tap, long-press peek, pinch, pan;
decisions in `gestures/gestures.ts`), `MobileTopBarComponent`, `MobileNavComponent` + `PageScrubberComponent`,
`MobileHeaderComponent`, `LibrarySheetComponent` (swipe rows, remove sheet). `ui/` holds `SheetComponent` (bottom
sheet, drag to dismiss), `CoverComponent`, `PageArtComponent`.

**Two navigation modes** (preserved from original):
- Click zones, taps and swipes: page-only, never cross a chapter (past the last page: the end-of-chapter card).
- Buttons and keybindings: advance chapter at chapter boundaries.

**Persistence** (all `localStorage`):
- `manga-reader-library`: full library with per-chapter page positions, favourites, chapter lengths, `updatedAt`.
- `manga-reader-last`: last opened manga/chapter/page for auto-resume on load.
- `manga-reader-bindings`: customisable key bindings.
- `manga-reader-preset`, `manga-reader-preset-names`: active preset + renamed labels.
- `manga-reader-autozoom`, `manga-reader-fitzoom`: auto-fit zoom toggle + settings.
- `manga-reader-motion`: `'full'` or `'reduced'`; absent = follow the system.
- `manga-reader-pan-hint-dismissed`: `'1'` once the "drag to pan" hint shown while zoomed was closed.

**Keybinding presets**: Default, WASD, Eating — stored in `KeybindingsService.PRESETS`.

**Tests**: `ng test` (vitest, jsdom). `src/test-setup.ts` swaps in an in-memory `localStorage`, because Node 25's own
one shadows jsdom's.
