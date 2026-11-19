import { Component, DestroyRef, inject } from '@angular/core';
import { ReaderService } from '../../services/reader.service';
import { UiService } from '../../services/ui.service';
import { ZoomService, DragStart } from '../../services/zoom.service';
import { View } from '../../services/zoom-math';
import {
  DOUBLE_TAP_MS, LONG_PRESS_MS, TAP_SLOP, Zone, classifyStroke, isDoubleTap, swipeAction, tapZone,
} from '../../gestures/gestures';

/** Zoom a double-tap at 100% goes to, around the tapped point. */
const DOUBLE_TAP_ZOOM = 2.2;

type Point = { x: number; y: number };

/** Touch reading surface (mobile layout). Invisible 28/44/28 tap zones and swipes turn pages only;
 *  pinch zooms, drag pans while zoomed, double-tap fits or zooms in, long-press peeks the controls. */
@Component({
  selector: 'app-gesture-layer',
  host: {
    class: 'fixed inset-0 z-10 block touch-none select-none [-webkit-touch-callout:none]',
    'data-stage': '',
    role: 'application',
    'aria-label': 'Page. Tap the left or right edge to turn pages, the middle for controls.',
    '(pointerdown)': 'down($event)',
    '(pointermove)': 'move($event)',
    '(pointerup)': 'up($event)',
    '(pointercancel)': 'reset()',
    '(contextmenu)': '$event.preventDefault()',
  },
  template: '',
})
export class GestureLayerComponent {
  private reader = inject(ReaderService);
  private ui = inject(UiService);
  private zoom = inject(ZoomService);

  private pointers = new Map<number, Point>();
  private stroke: (Point & { t: number }) | null = null;
  private moved = false;
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
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1) {
      this.stroke = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      this.moved = false;
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
    if (!this.moved && Math.hypot(e.clientX - this.stroke.x, e.clientY - this.stroke.y) > TAP_SLOP) {
      this.moved = true;
      clearTimeout(this.longPress);
    }
    if (this.pan) this.zoom.doDrag(this.pan, e.clientX, e.clientY);
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
    if (this.longPressed) { this.ui.peeking.set(false); return; }

    const kind = classifyStroke({ dx: e.clientX - s.x, dy: e.clientY - s.y, ms: e.timeStamp - s.t }, this.zoom.isZoomed());
    if (kind === 'tap') { this.tap(e.clientX, e.clientY, e.timeStamp); return; }
    const turn = swipeAction(kind);
    if (turn === 'next') this.reader.nextPage();
    else if (turn === 'prev') this.reader.prevPage();
  }

  protected reset() {
    clearTimeout(this.longPress);
    this.pointers.clear();
    this.stroke = null;
    this.pinch = null;
    this.endPan();
    if (this.longPressed) this.ui.peeking.set(false);
  }

  /** Edge taps at 100% act at once, so page turns never wait. Other taps wait briefly for a second tap. */
  private tap(x: number, y: number, t: number) {
    const zone = tapZone(x, window.innerWidth);
    if (!this.zoom.isZoomed() && zone !== 'center') { this.lastTap = null; this.act(zone); return; }
    if (isDoubleTap(this.lastTap, x, y, t)) {
      clearTimeout(this.pendingTap);
      this.lastTap = null;
      if (this.zoom.isZoomed()) this.zoom.resetZoom();
      else this.zoom.setZoom(DOUBLE_TAP_ZOOM, x, y);
      return;
    }
    this.lastTap = { x, y, t };
    clearTimeout(this.pendingTap);
    this.pendingTap = setTimeout(() => { this.lastTap = null; this.act(zone); }, DOUBLE_TAP_MS);
  }

  private act(zone: Zone) {
    if (zone === 'prev') this.reader.prevPage();
    else if (zone === 'next') this.reader.nextPage();
    else this.ui.togglePanels();
  }

  private endPan() {
    if (this.pan) { this.pan = null; this.zoom.endDrag(); }
  }
}

function mid(a: Point, b: Point): Point { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
function dist(a: Point, b: Point): number { return Math.hypot(a.x - b.x, a.y - b.y); }
