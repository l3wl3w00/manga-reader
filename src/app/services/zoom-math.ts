/** Pure zoom/pan geometry. The current page lives in a frame (its strip slot). At 100% the frame is the page,
 *  drawn object-contain in the window (less `inset` on each side: mobile keeps room for the neighbour slivers).
 *  Zooming in grows the frame up to `maxW`, which still leaves a strip of each neighbour on screen, and the page
 *  is scaled and panned inside it: translate(panX, panY) scale(zoom), transform-origin 0 0, relative to the frame.
 *  All x coordinates are the strip's (before the desktop rail offset). */

export interface Size { w: number; h: number; }
export interface FitSettings { heightPct: number; maxWidthPct: number; }
export interface View { zoom: number; panX: number; panY: number; }
export interface Rect { x: number; y: number; w: number; h: number; }

/** Where the page sits at 100%, the widest its frame may grow, and the window height. */
export interface FrameGeometry { page: Rect; maxW: number; vpH: number; }

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
/** A typical manga page, used when no real page size is known (settings preview). */
export const TYPICAL_PAGE: Size = { w: 700, h: 1000 };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Where the image sits at zoom 1. */
export function containRect(vp: Size, img: Size, inset = 0): Rect {
  const scale = Math.min((vp.w - 2 * inset) / img.w, vp.h / img.h);
  const w = img.w * scale, h = img.h * scale;
  return { x: (vp.w - w) / 2, y: (vp.h - h) / 2, w, h };
}

/** The widest frame centred at `centre` that still leaves `strip` px of each neighbour (`gap` px away) inside
 *  [left, right]. */
export function maxFrameWidth(centre: number, left: number, right: number, gap: number, strip: number): number {
  return 2 * (Math.min(centre - left, right - centre) - gap - strip);
}

/** Narrowest a zoomed frame gets, however little room the neighbour strips leave. */
const MIN_FRAME_W = 240;

/** The current page's frame at `zoom`: the page at 100%, grown with the zoom up to maxW wide and the window
 *  tall, around the same centre. Zoomed in, it is held to maxW even where the page at 100% is wider (a narrow
 *  window with the panels locked), so the neighbour strips always show. */
export function frameAt(g: FrameGeometry, zoom: number): Rect {
  const cap = Math.max(g.maxW, Math.min(g.page.w, MIN_FRAME_W));
  const w = zoom > 1.001 ? Math.min(g.page.w * zoom, cap) : g.page.w;
  const h = Math.max(g.page.h, Math.min(g.page.h * zoom, g.vpH));
  return { x: g.page.x + (g.page.w - w) / 2, y: g.page.y + (g.page.h - h) / 2, w, h };
}

/** Keeps the frame covered by the page where the page is bigger than it, and centres it where it is smaller. */
export function clampPan(g: FrameGeometry, v: View): View {
  const f = frameAt(g, v.zoom);
  const axis = (pan: number, frame: number, content: number) =>
    content <= frame ? (frame - content) / 2 : clamp(pan, frame - content, 0);
  return { zoom: v.zoom, panX: axis(v.panX, f.w, g.page.w * v.zoom), panY: axis(v.panY, f.h, g.page.h * v.zoom) };
}

/** Zooms to `zoom`, keeping the page point under (cx, cy) still while the frame grows around it. */
export function zoomAround(g: FrameGeometry, v: View, zoom: number, cx: number, cy: number): View {
  const nz = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  if (nz === MIN_ZOOM) return clampPan(g, { zoom: nz, panX: 0, panY: 0 });
  const f = frameAt(g, v.zoom), nf = frameAt(g, nz);
  // The point in page pixels at 100%.
  const u = (cx - f.x - v.panX) / v.zoom, w = (cy - f.y - v.panY) / v.zoom;
  return clampPan(g, { zoom: nz, panX: cx - nf.x - u * nz, panY: cy - nf.y - w * nz });
}

/** Auto-fit framing: show heightPct of the page's height, never wider than maxWidthPct of the window nor than the
 *  frame may grow (the neighbour strips stay), horizontally centred and starting at the top of the page. */
export function fitView(g: FrameGeometry, fs: FitSettings, vpW: number): View {
  const widest = Math.min((fs.maxWidthPct / 100) * vpW, g.maxW);
  const zoom = clamp(Math.min(widest / g.page.w, g.vpH / ((fs.heightPct / 100) * g.page.h)), MIN_ZOOM, MAX_ZOOM);
  return clampPan(g, { zoom, panX: (frameAt(g, zoom).w - g.page.w * zoom) / 2, panY: 0 });
}

/** The part of the page in its frame, as fractions (0-1) of the page. For the minimap. */
export function visibleRegion(g: FrameGeometry, v: View): Rect {
  const f = frameAt(g, v.zoom);
  const cw = g.page.w * v.zoom, ch = g.page.h * v.zoom;
  const left = -v.panX / cw, top = -v.panY / ch;
  const x = clamp(left, 0, 1), y = clamp(top, 0, 1);
  return { x, y, w: clamp(left + f.w / cw, 0, 1) - x, h: clamp(top + f.h / ch, 0, 1) - y };
}

/** Desktop with the panels locked: how far to slide the page strip right so it is centred in the space right of
 *  the rail, which ends at `railEdge` (about 190px at 1440 wide). When the page does not fit there it goes flush
 *  right instead, as far clear of the rail as it can be. */
export function clearRailOffset(vp: Size, img: Size, railEdge: number, margin = 24): number {
  const r = containRect(vp, img);
  const free = vp.w - railEdge - margin;
  const target = free >= r.w ? railEdge + (free - r.w) / 2 : vp.w - r.w;
  return Math.max(0, target - r.x);
}
