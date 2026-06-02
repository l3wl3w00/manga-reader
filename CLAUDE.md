# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A single-file static HTML manga reader (`index.html`). No build system, no dependencies to install, no package.json. Open `index.html` directly in a browser to run it.

## Development

Just open `index.html` in a browser — there's no build step, no dev server, no tests. All logic, markup, and styles are in one file.

External dependencies loaded via CDN:
- Tailwind CSS (utility classes)
- Lucide icons (`lucide.createIcons()` must be called after any HTML that adds `data-lucide` attributes)

## Architecture

Everything lives inside a single IIFE in `index.html`. Key state and concepts:

**Core state object** (`s`): `{ manga, chapter, page, totalPages, busy }` — `busy` is a mutex to prevent concurrent loads.

**Image source**: Pages are fetched from `https://images.mangafreak.me/mangas/{manga}/{manga}_{ch}/{manga}_{ch}_{pg}.jpg` with `referrerpolicy="no-referrer"`. The app probes this URL with an `Image` object; `onerror` means the page doesn't exist.

**`load(manga, ch, pg, opts)`**: Core function. Probes whether a page image exists before showing it. On success, calls `probeNext()` to determine `totalPages` by probing `pg+1` and waiting for its error.

**Two navigation modes**:
- Click zones (left/right 28% of screen): page-only, never auto-advances chapter
- Buttons and keybindings: advance chapter at chapter boundaries

**Persistence** (all `localStorage`):
- `manga-reader-library`: full library with per-chapter page positions, favourites, chapter lengths
- `manga-reader-last`: last opened manga/chapter/page for auto-resume on load
- `manga-reader-bindings`: customisable key bindings

**Auto-hide**: UI panels (`#topbar`, `#bottombar`) and cursor hide after 2.8s of inactivity while a manga is open. `freezeControls()` / `showControls()` manage this. `kbOpen` flag prevents hiding while the keybindings modal is open.

**Zoom/pan**: CSS `transform` on `#zoom-root`. `setZoom()` zooms toward the current mouse position. `clampPan()` keeps the image within viewport bounds.
