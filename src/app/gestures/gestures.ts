/** Pure decisions for touch reading: where a tap lands and what a finished stroke means. */

export type Zone = 'prev' | 'center' | 'next';

/** Left and right 28% turn pages, the middle 44% toggles the controls (same split as desktop). */
export const EDGE_ZONE = 0.28;

export function tapZone(x: number, width: number): Zone {
  if (x < width * EDGE_ZONE) return 'prev';
  if (x > width * (1 - EDGE_ZONE)) return 'next';
  return 'center';
}

export interface Stroke { dx: number; dy: number; ms: number; }

export const TAP_SLOP = 10;
export const TAP_MAX_MS = 350;
export const SWIPE_MIN = 50;
export const SWIPE_MAX_MS = 700;
export const LONG_PRESS_MS = 450;
export const DOUBLE_TAP_MS = 260;
export const DOUBLE_TAP_SLOP = 32;

export type StrokeKind = 'tap' | 'swipe-left' | 'swipe-right' | 'none';

/** Classifies a one-finger stroke. Swipes only count at 100%: zoomed in, a drag pans. */
export function classifyStroke(s: Stroke, zoomed: boolean): StrokeKind {
  const dist = Math.hypot(s.dx, s.dy);
  if (dist <= TAP_SLOP) return s.ms <= TAP_MAX_MS ? 'tap' : 'none';
  if (zoomed || s.ms > SWIPE_MAX_MS) return 'none';
  if (Math.abs(s.dx) < SWIPE_MIN || Math.abs(s.dx) < Math.abs(s.dy) * 1.5) return 'none';
  return s.dx < 0 ? 'swipe-left' : 'swipe-right';
}

/** Swiping left brings the next page in, like turning a sheet of paper. */
export function swipeAction(kind: StrokeKind): 'next' | 'prev' | null {
  if (kind === 'swipe-left') return 'next';
  if (kind === 'swipe-right') return 'prev';
  return null;
}

export function isDoubleTap(prev: { x: number; y: number; t: number } | null, x: number, y: number, t: number): boolean {
  return !!prev && t - prev.t <= DOUBLE_TAP_MS && Math.hypot(x - prev.x, y - prev.y) <= DOUBLE_TAP_SLOP;
}

/** Library rows: where a released horizontal drag settles. Open shows the action tiles. */
export function settleSwipe(offset: number, actionsWidth: number, wasOpen: boolean): boolean {
  const threshold = actionsWidth * (wasOpen ? 0.7 : 0.35);
  return -offset > threshold;
}

/** Page scrubber: the page under x on a track `width` wide holding `total` pages. */
export function pageAt(x: number, width: number, total: number): number {
  if (total < 1 || width <= 0) return 1;
  return Math.min(total, Math.max(1, Math.floor((x / width) * total) + 1));
}
