/** Pure zoom/pan geometry. The page is drawn object-contain in the viewport, then transformed by
 *  translate(panX, panY) scale(zoom) with transform-origin 0 0. */

export interface Size { w: number; h: number; }
export interface FitSettings { heightPct: number; maxWidthPct: number; }
export interface View { zoom: number; panX: number; panY: number; }
export interface Rect { x: number; y: number; w: number; h: number; }

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
/** A typical manga page, used when no real page size is known (settings preview). */
export const TYPICAL_PAGE: Size = { w: 700, h: 1000 };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Where the image sits at zoom 1. */
export function containRect(vp: Size, img: Size): Rect {
  const scale = Math.min(vp.w / img.w, vp.h / img.h);
  const w = img.w * scale, h = img.h * scale;
  return { x: (vp.w - w) / 2, y: (vp.h - h) / 2, w, h };
}

/** Keeps the viewport covered: pan stays within [viewport * (1 - zoom), 0]. */
export function clampView(vp: Size, v: View): View {
  return {
    zoom: v.zoom,
    panX: clamp(v.panX, vp.w * (1 - v.zoom), 0),
    panY: clamp(v.panY, vp.h * (1 - v.zoom), 0),
  };
}

/** Zooms to `zoom`, keeping the point (cx, cy) on screen still. */
export function zoomAround(vp: Size, v: View, zoom: number, cx: number, cy: number): View {
  const nz = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  if (nz === MIN_ZOOM) return { zoom: nz, panX: 0, panY: 0 };
  const sc = nz / v.zoom;
  return clampView(vp, { zoom: nz, panX: cx - (cx - v.panX) * sc, panY: cy - (cy - v.panY) * sc });
}

/** Auto-fit framing: show heightPct of the page's height, never wider than maxWidthPct of the
 *  viewport, horizontally centred and starting at the top of the page. */
export function fitView(vp: Size, img: Size, fs: FitSettings): View {
  const r = containRect(vp, img);
  const zoom = clamp(
    Math.min((fs.maxWidthPct / 100) * vp.w / r.w, vp.h / ((fs.heightPct / 100) * r.h)),
    MIN_ZOOM, MAX_ZOOM,
  );
  return clampView(vp, { zoom, panX: (vp.w * (1 - zoom)) / 2, panY: -r.y * zoom });
}

/** The part of the page on screen, as fractions (0-1) of the page. For the minimap. */
export function visibleRegion(vp: Size, img: Size, v: View): Rect {
  const r = containRect(vp, img);
  const left = (-v.panX / v.zoom - r.x) / r.w;
  const top = (-v.panY / v.zoom - r.y) / r.h;
  const right = left + vp.w / v.zoom / r.w;
  const bottom = top + vp.h / v.zoom / r.h;
  const x = clamp(left, 0, 1), y = clamp(top, 0, 1);
  return { x, y, w: clamp(right, 0, 1) - x, h: clamp(bottom, 0, 1) - y };
}

/** Desktop with the panels up: how far to slide the page (at 100%) right so the rail, which ends at
 *  `railEdge`, does not cover it. Centres it in the space right of the rail when it fits there. */
export function clearRailOffset(vp: Size, img: Size, railEdge: number, margin = 24): number {
  const r = containRect(vp, img);
  if (r.x >= railEdge) return 0;
  const free = vp.w - railEdge - margin;
  const target = free >= r.w ? railEdge + (free - r.w) / 2 : vp.w - r.w;
  return Math.max(0, target - r.x);
}
