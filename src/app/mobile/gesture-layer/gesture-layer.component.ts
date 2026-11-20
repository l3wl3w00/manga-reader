import { Component, DestroyRef, inject } from '@angular/core';
import { UiService } from '../../services/ui.service';
import { ZoomService, DragStart } from '../../services/zoom.service';
import { StripService } from '../../services/strip.service';
import { View } from '../../services/zoom-math';
import { DOUBLE_TAP_MS, LONG_PRESS_MS, TAP_SLOP, flickVelocity, isDoubleTap, isTap, swipeAxis } from '../../gestures/gestures';

/** Zoom a double-tap at 100% goes to, around the tapped point. */
const DOUBLE_TAP_ZOOM = 2.2;

type Point = { x: number; y: number };

/** Touch reading surface (mobile layout). A tap never turns the page: one tap anywhere shows or hides the
 *  controls. Only a horizontal swipe at 100% turns it, dragging the page strip with the finger (page only).
 *  Pinch zooms, drag pans while zoomed, double-tap fits or zooms in, long-press peeks the controls. */
@Component({
  selector: 'app-gesture-layer',
  host: {
    class: 'fixed inset-0 z-10 block touch-none select-none [-webkit-touch-callout:none]',
    'data-stage': '',
    role: 'application',
    'aria-label': 'Page. Swipe sideways to turn pages; tap to show or hide the controls.',
    '(pointerdown)': 'down($event)',
    '(pointermove)': 'move($event)',
    '(pointerup)': 'up($event)',
    '(pointercancel)': 'reset()',
    '(contextmenu)': '$event.preventDefault()',
  },
  template: '',
})
export class GestureLayerComponent {
  private ui = inject(UiService);
  private zoom = inject(ZoomService);
  private strip = inject(StripService);

  private pointers = new Map<number, Point>();
  private stroke: (Point & { t: number }) | null = null;
  private moved = false;
  /** This stroke drags the strip sideways (decided once it leaves the tap slop). */
  private swiping = false;
  private samples: { x: number; t: number }[] = [];
  private pan: DragStart | null = null;
  private pinch: { view: View; mid: Point; dist: number } | null = null;
  private longPress: ReturnType<typeof setTimeout> | undefined;
  private longPressed = false;
  private lastTap: (Point & { t: number }) | null = null;
  private pendingTap: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => { clearTimeout(this.longPress); clearTimeout(this.pendingTap); });
  }

  protected down(e: PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1) {
      this.stroke = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      this.moved = false;
      this.swiping = false;
      this.samples = [{ x: e.clientX, t: e.timeStamp }];
      this.longPressed = false;
      this.pan = this.zoom.isZoomed() ? this.zoom.startDrag(e.clientX, e.clientY) : null;
      clearTimeout(this.longPress);
      this.longPress = setTimeout(() => {
        if (this.moved || !this.stroke) return;
        this.longPressed = true;
        this.ui.peeking.set(true);
        navigator.vibrate?.(8);
      }, LONG_PRESS_MS);
    } else if (this.pointers.size === 2) {
      clearTimeout(this.longPress);
      this.stroke = null;
      this.endSwipe();
      this.endPan();
      const [a, b] = [...this.pointers.values()];
      this.pinch = { view: this.zoom.snapshot(), mid: mid(a, b), dist: Math.max(1, dist(a, b)) };
    }
  }

  protected move(e: PointerEvent) {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pinch && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      this.zoom.pinch(this.pinch.view, this.pinch.mid, dist(a, b) / this.pinch.dist, mid(a, b));
      return;
    }
    if (!this.stroke) return;
    const dx = e.clientX - this.stroke.x, dy = e.clientY - this.stroke.y;
    if (!this.moved && Math.hypot(dx, dy) > TAP_SLOP) {
      this.moved = true;
      clearTimeout(this.longPress);
      // Only at 100%: zoomed in, a drag pans.
      this.swiping = !this.pan && !this.longPressed && swipeAxis(dx, dy) === 'x';
    }
    this.samples.push({ x: e.clientX, t: e.timeStamp });
    if (this.samples.length > 6) this.samples.shift();
    if (this.pan) this.zoom.doDrag(this.pan, e.clientX, e.clientY);
    else if (this.swiping) this.strip.drag(dx);
  }

  protected up(e: PointerEvent) {
    if (!this.pointers.delete(e.pointerId)) return;
    if (this.pinch) {
      // Lifting one finger of a pinch ends it; the rest of that touch is not a tap or swipe.
      if (this.pointers.size < 2) this.pinch = null;
      this.stroke = null;
      return;
    }
    clearTimeout(this.longPress);
    const s = this.stroke;
    this.stroke = null;
    this.endPan();
    if (!s) return;
    if (this.longPressed) { this.ui.peeking.set(false); this.endSwipe(); return; }
    if (this.swiping) {
      this.swiping = false;
      this.samples.push({ x: e.clientX, t: e.timeStamp });
      this.strip.release(e.clientX - s.x, flickVelocity(this.samples));
      return;
    }
    if (isTap({ dx: e.clientX - s.x, dy: e.clientY - s.y, ms: e.timeStamp - s.t })) this.tap(e.clientX, e.clientY, e.timeStamp);
  }

  protected reset() {
    clearTimeout(this.longPress);
    this.pointers.clear();
    this.stroke = null;
    this.pinch = null;
    this.endPan();
    this.endSwipe();
    if (this.longPressed) this.ui.peeking.set(false);
  }

  /** Every tap means the same, wherever it lands: show or hide the controls. It waits briefly in case a second
   *  tap makes it a double-tap (zoom). */
  private tap(x: number, y: number, t: number) {
    if (isDoubleTap(this.lastTap, x, y, t)) {
      clearTimeout(this.pendingTap);
      this.lastTap = null;
      if (this.zoom.isZoomed()) this.zoom.resetZoom();
      else this.zoom.setZoom(DOUBLE_TAP_ZOOM, x, y);
      return;
    }
    this.lastTap = { x, y, t };
    clearTimeout(this.pendingTap);
    this.pendingTap = setTimeout(() => { this.lastTap = null; this.ui.togglePanels(); }, DOUBLE_TAP_MS);
  }

  private endSwipe() {
    if (this.swiping) { this.swiping = false; this.strip.cancel(); }
  }

  private endPan() {
    if (this.pan) { this.pan = null; this.zoom.endDrag(); }
  }
}

function mid(a: Point, b: Point): Point { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
function dist(a: Point, b: Point): number { return Math.hypot(a.x - b.x, a.y - b.y); }
