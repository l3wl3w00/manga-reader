/** Pure decisions for touch reading. A tap never turns the page (it shows or hides the controls); only a
 *  horizontal swipe at 100% does, by dragging the page strip with the finger. */

export interface Stroke { dx: number; dy: number; ms: number; }

export const TAP_SLOP = 10;
export const TAP_MAX_MS = 350;
export const LONG_PRESS_MS = 450;
export const DOUBLE_TAP_MS = 260;
export const DOUBLE_TAP_SLOP = 32;

/** A short, still touch. What it does is always the same: the controls (or, twice, a zoom). */
export function isTap(s: Stroke): boolean {
  return Math.hypot(s.dx, s.dy) <= TAP_SLOP && s.ms <= TAP_MAX_MS;
}

export function isDoubleTap(prev: { x: number; y: number; t: number } | null, x: number, y: number, t: number): boolean {
  return !!prev && t - prev.t <= DOUBLE_TAP_MS && Math.hypot(x - prev.x, y - prev.y) <= DOUBLE_TAP_SLOP;
}

/** Once a touch has moved past the tap slop: is it a sideways drag (the strip follows) or not (ignored)? */
export function swipeAxis(dx: number, dy: number): 'x' | 'y' {
  return Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
}

/** Past this share of a page the strip snaps on to the neighbour; short of it, it springs back. */
export const SNAP_RATIO = 0.4;
/** A flick (px/ms) turns the page even short of the snap mark... */
export const FLICK_SPEED = 0.45;
/** ...as long as it travelled at least this far the same way. */
export const FLICK_MIN = 24;
/** Toward a slot it cannot turn to (no earlier page, the chapter's end), the strip only gives a little. */
export const RUBBER = 0.25;

/** Has the drag gone far enough that letting go turns the page? The incoming page sharpens from here. */
export function isArmed(dx: number, step: number): boolean {
  return step > 0 && Math.abs(dx) >= SNAP_RATIO * step;
}

/** Where a released swipe settles. Left (dx < 0) brings the next page in, like turning a sheet of paper. */
export function swipeSnap(dx: number, vx: number, step: number): 'next' | 'prev' | 'back' {
  if (isArmed(dx, step)) return dx < 0 ? 'next' : 'prev';
  if (dx <= -FLICK_MIN && vx <= -FLICK_SPEED) return 'next';
  if (dx >= FLICK_MIN && vx >= FLICK_SPEED) return 'prev';
  return 'back';
}

/** How far the strip moves under a finger that has moved dx: one to one toward a page it can turn to (up to a
 *  whole page), with resistance toward one it cannot. */
export function dragOffset(dx: number, step: number, canPrev: boolean, canNext: boolean): number {
  const free = dx < 0 ? canNext : canPrev;
  if (!free) return dx * RUBBER;
  return Math.max(-step, Math.min(step, dx));
}

/** Finger speed (px/ms) over the last samples, for flicks. */
export function flickVelocity(samples: { x: number; t: number }[]): number {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  const first = samples.find(s => last.t - s.t <= 100) ?? samples[0];
  const dt = last.t - first.t;
  return dt > 0 ? (last.x - first.x) / dt : 0;
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
