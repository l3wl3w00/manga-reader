# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

An Angular 22 manga reader app. Build with `ng build` and open `dist/manga-reader/browser/index.html` directly in a browser (no dev server needed — `baseHref` is set to `./`).

## Development

```bash
ng build              # production build → dist/manga-reader/browser/
ng build --watch --configuration development  # watch mode
ng serve              # dev server on localhost
```

External image source: `https://images.mangafreak.me/mangas/{manga}/{manga}_{ch}/{manga}_{ch}_{pg}.jpg` with `referrerpolicy="no-referrer"`.

## Architecture

**Services** (`src/app/services/`):
- `ReaderService` — core state signals (`manga`, `chapter`, `page`, `totalPages`, `busy`, `screen`, `imgSrc`), `load()`, navigation (`nextPage`, `prevPage`, `nextPageFull`, `prevPageFull`, `nextChapter`, `prevChapter`). Probes image URLs with `Image` objects; `onerror` = 404.
- `LibraryService` — localStorage library (`manga-reader-library`), per-chapter page positions, favourites. `entries` signal auto-sorts by favourite then recency.
- `ZoomService` — zoom/pan signals, `setZoom()`, `autoFitZoom()`, `clampPan()`, drag helpers. Zoom toward mouse position.
- `KeybindingsService` — keybinding presets, recording mode, `matches(e, action)`.

**Components** (`src/app/components/`):
- `ReaderComponent` — image display + zoom-root div with CSS transform. Owns mouse events (drag, wheel).
- `ControlPanelComponent` — left sidebar: manga/chapter/page inputs, Go button, search/site links.
- `LibraryPanelComponent` — library list with covers, progress bars, favourite/remove actions.
- `BottomBarComponent` — bottom nav: prev/next page and chapter buttons with page info.
- `SettingsModalComponent` — keybinding editor with preset switching, zoom settings tab.

**AppComponent** (`src/app/app.ts`):
- Owns `panelsLocked` / `peeking` / `showPanels` signals for panel visibility.
- Handles all `@HostListener` keyboard events and dispatches to services.
- Bootstraps via `viewChild` to `SettingsModalComponent`.

**Two navigation modes** (preserved from original):
- Click zones (left/right 28%): page-only, never auto-advances chapter.
- Buttons and keybindings: advance chapter at chapter boundaries.

**Persistence** (all `localStorage`):
- `manga-reader-library`: full library with per-chapter page positions, favourites, chapter lengths.
- `manga-reader-last`: last opened manga/chapter/page for auto-resume on load.
- `manga-reader-bindings`: customisable key bindings.
- `manga-reader-preset`, `manga-reader-preset-names`: active preset + renamed labels.
- `manga-reader-autozoom`, `manga-reader-fitzoom`: auto-fit zoom toggle + settings.

**Keybinding presets**: Default, WASD, Eating — stored in `KeybindingsService.PRESETS`.
