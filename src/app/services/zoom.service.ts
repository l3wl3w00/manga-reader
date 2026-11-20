import { Injectable, Injector, signal, computed, inject } from '@angular/core';
import {
  FitSettings, FrameGeometry, Size, TYPICAL_PAGE, View, clampPan, clearRailOffset, containRect, fitView, frameAt,
  maxFrameWidth, visibleRegion, zoomAround,
} from './zoom-math';
import { LayoutService } from './layout.service';
import { UiService } from './ui.service';
import { DESKTOP_NEIGHBOUR_MIN, MOBILE_INSET, MOBILE_SLIVER, RAIL_EDGE, STRIP_GAP } from '../strip/strip';

export const ZOOM_STEP = 0.15;
export const PAN_STEP = 80;

const AUTOZOOM_STORAGE = 'manga-reader-autozoom';
const FITZOOM_STORAGE  = 'manga-reader-fitzoom';

export interface DragStart { startX: number; startY: number; panX: number; panY: number; }

function readJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}

/** Zoom and pan of the current page inside its frame (see zoom-math.ts). Pointer coordinates come in as
 *  window coordinates; the frame lives in strip coordinates, which the desktop rail offset shifts. */
@Injectable({ providedIn: 'root' })
export class ZoomService {
  private layout = inject(LayoutService);
  // UiService reaches ZoomService through ReaderService: read it lazily, never at construction.
  private injector = inject(Injector);

  readonly zoom   = signal(1);
  readonly panX   = signal(0);
  readonly panY   = signal(0);
  readonly mouseX = signal(window.innerWidth / 2);
  readonly mouseY = signal(window.innerHeight / 2);
  readonly isDragging = signal(false);
  /** Natural size of the page on screen, once loaded. */
  readonly imageSize = signal<Size | null>(null);
  /** Bumped by every zoom or pan, so the zoom chip can show itself on mobile. */
  readonly activity = signal(0);

  readonly autoFit = signal<boolean>(readJson(AUTOZOOM_STORAGE, false));
  readonly fitSettings = signal<FitSettings>({ heightPct: 60, maxWidthPct: 90, ...readJson(FITZOOM_STORAGE, {}) });

  /** Room kept free beside the page at 100% (mobile: the neighbour slivers). */
  readonly inset = computed(() => (this.layout.mobile() ? MOBILE_INSET : 0));

  /** Desktop with the panels locked: the strip re-centres right of the rail (at any zoom). */
  private readonly railLocked = computed(() => !this.layout.mobile() && this.injector.get(UiService).panelsLocked());
  readonly railOffset = computed(() => {
    if (!this.railLocked()) return 0;
    return clearRailOffset(this.layout.viewport(), this.imageSize() ?? TYPICAL_PAGE, RAIL_EDGE);
  });

  /** The page at 100% and how wide its frame may grow: a strip of each neighbour always stays on screen
   *  (desktop: DESKTOP_NEIGHBOUR_MIN px, measured from the rail's edge while it is locked; mobile: the slivers).
   *  Exception, the owner's choice: on a phone with auto-fit on, the frame may grow to the full window width, so
   *  auto-fit can zoom a portrait page in (the slivers go off screen while zoomed). */
  readonly geometry = computed<FrameGeometry>(() => {
    const vp = this.layout.viewport(), mobile = this.layout.mobile();
    const page = containRect(vp, this.imageSize() ?? TYPICAL_PAGE, this.inset());
    const off = this.railOffset();
    const left = (this.railLocked() ? RAIL_EDGE : 0) - off, right = vp.w - off;
    const maxW = mobile
      ? (this.autoFit() ? vp.w : maxFrameWidth(page.x + page.w / 2, left, right, STRIP_GAP.mobile, MOBILE_SLIVER))
      : maxFrameWidth(page.x + page.w / 2, left, right, STRIP_GAP.desktop, DESKTOP_NEIGHBOUR_MIN);
    return { page, maxW, vpH: vp.h };
  });

  /** The zoom and pan in effect (re-clamped when the window or the page changes). */
  private readonly view = computed<View>(() =>
    clampPan(this.geometry(), { zoom: this.zoom(), panX: this.panX(), panY: this.panY() }));
  /** The current page's frame, in strip coordinates. */
  readonly frame = computed(() => frameAt(this.geometry(), this.zoom()));

  readonly transform = computed(() => { const v = this.view(); return `translate(${v.panX}px,${v.panY}px) scale(${v.zoom})`; });
  readonly percent = computed(() => Math.round(this.zoom() * 100));
  readonly isZoomed = computed(() => this.zoom() > 1.001);
  /** Visible part of the page (fractions), for the minimap. */
  readonly region = computed(() => (this.imageSize() ? visibleRegion(this.geometry(), this.view()) : null));

  private apply(v: View) {
    const c = clampPan(this.geometry(), v);
    this.zoom.set(c.zoom); this.panX.set(c.panX); this.panY.set(c.panY);
    this.activity.update(n => n + 1);
  }

  toggleAutoFit() {
    this.autoFit.update(v => !v);
    localStorage.setItem(AUTOZOOM_STORAGE, JSON.stringify(this.autoFit()));
  }

  updateFitSettings(heightPct: number, maxWidthPct: number) {
    this.fitSettings.set({ heightPct, maxWidthPct });
    localStorage.setItem(FITZOOM_STORAGE, JSON.stringify(this.fitSettings()));
  }

  clampPan() { this.apply(this.view()); }

  /** Zooms toward the mouse (or the given window point). */
  setZoom(nz: number, cx = this.mouseX(), cy = this.mouseY()) {
    this.apply(zoomAround(this.geometry(), this.view(), nz, cx - this.railOffset(), cy));
  }

  panBy(dx: number, dy: number) {
    const v = this.view();
    this.apply({ ...v, panX: v.panX + dx, panY: v.panY + dy });
  }

  /** Space: jump between the top and the bottom of the page. */
  jumpVertical() {
    const v = this.view(), g = this.geometry();
    const minY = frameAt(g, v.zoom).h - g.page.h * v.zoom;
    this.apply({ ...v, panY: v.panY > minY / 2 ? minY : 0 });
  }

  resetZoom() { this.apply({ zoom: 1, panX: 0, panY: 0 }); }

  /** Auto-fit framing for a page of this natural size (the frame follows the same cap). */
  autoFitZoom(iw: number, ih: number) {
    const vp = this.layout.viewport();
    const g = { ...this.geometry(), page: containRect(vp, { w: iw, h: ih }, this.inset()) };
    this.apply(fitView(g, this.fitSettings(), vp.w));
  }

  /** The zoom auto-fit would give a page of this size in this window (settings preview). */
  fitZoomFor(img: Size): number {
    const vp = this.layout.viewport();
    return fitView({ ...this.geometry(), page: containRect(vp, img, this.inset()) }, this.fitSettings(), vp.w).zoom;
  }

  /** Applies the auto-fit framing to the current page. */
  fitPage() {
    const img = this.imageSize();
    if (img) this.autoFitZoom(img.w, img.h);
  }

  startDrag(clientX: number, clientY: number): DragStart {
    this.isDragging.set(true);
    const v = this.view();
    return { startX: clientX, startY: clientY, panX: v.panX, panY: v.panY };
  }

  doDrag(drag: DragStart, clientX: number, clientY: number) {
    this.apply({ zoom: this.zoom(), panX: drag.panX + (clientX - drag.startX), panY: drag.panY + (clientY - drag.startY) });
  }

  endDrag() { this.isDragging.set(false); }

  /** Pinch: scale from the start view by `ratio` around the start midpoint, following the midpoint as it moves. */
  pinch(start: View, startMid: { x: number; y: number }, ratio: number, mid: { x: number; y: number }) {
    const off = this.railOffset();
    const zoomed = zoomAround(this.geometry(), start, start.zoom * ratio, startMid.x - off, startMid.y);
    if (zoomed.zoom === 1) { this.apply(zoomed); return; }
    this.apply({ ...zoomed, panX: zoomed.panX + mid.x - startMid.x, panY: zoomed.panY + mid.y - startMid.y });
  }

  snapshot(): View { return this.view(); }
}
