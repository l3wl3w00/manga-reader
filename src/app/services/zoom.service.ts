import { Injectable, signal, computed } from '@angular/core';
import { FitSettings, Size, View, clampView, fitView, visibleRegion, zoomAround } from './zoom-math';

export const ZOOM_STEP = 0.15;
export const PAN_STEP = 80;

const AUTOZOOM_STORAGE = 'manga-reader-autozoom';
const FITZOOM_STORAGE  = 'manga-reader-fitzoom';

export interface DragStart { startX: number; startY: number; panX: number; panY: number; }

function readJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}

@Injectable({ providedIn: 'root' })
export class ZoomService {
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

  readonly transform = computed(() => `translate(${this.panX()}px,${this.panY()}px) scale(${this.zoom()})`);
  readonly percent = computed(() => Math.round(this.zoom() * 100));
  readonly isZoomed = computed(() => this.zoom() > 1.001);
  /** Visible part of the page (fractions), for the minimap. */
  readonly region = computed(() => {
    const img = this.imageSize();
    return img ? visibleRegion(this.viewport(), img, this.view()) : null;
  });

  private viewport(): Size { return { w: window.innerWidth, h: window.innerHeight }; }
  private view(): View { return { zoom: this.zoom(), panX: this.panX(), panY: this.panY() }; }

  private apply(v: View) {
    this.zoom.set(v.zoom); this.panX.set(v.panX); this.panY.set(v.panY);
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

  clampPan() { this.apply(clampView(this.viewport(), this.view())); }

  /** Zooms toward the mouse (or the given point). */
  setZoom(nz: number, cx = this.mouseX(), cy = this.mouseY()) {
    this.apply(zoomAround(this.viewport(), this.view(), nz, cx, cy));
  }

  panBy(dx: number, dy: number) {
    this.apply(clampView(this.viewport(), { zoom: this.zoom(), panX: this.panX() + dx, panY: this.panY() + dy }));
  }

  /** Space: jump between the top and the bottom of the page. */
  jumpVertical() {
    const minY = window.innerHeight * (1 - this.zoom());
    this.apply(clampView(this.viewport(), { ...this.view(), panY: this.panY() > minY / 2 ? minY : 0 }));
  }

  resetZoom() { this.apply({ zoom: 1, panX: 0, panY: 0 }); }

  autoFitZoom(iw: number, ih: number) {
    this.apply(fitView(this.viewport(), { w: iw, h: ih }, this.fitSettings()));
  }

  /** Applies the auto-fit framing to the current page. */
  fitPage() {
    const img = this.imageSize();
    if (img) this.autoFitZoom(img.w, img.h);
  }

  startDrag(clientX: number, clientY: number): DragStart {
    this.isDragging.set(true);
    return { startX: clientX, startY: clientY, panX: this.panX(), panY: this.panY() };
  }

  doDrag(drag: DragStart, clientX: number, clientY: number) {
    this.apply(clampView(this.viewport(), {
      zoom: this.zoom(),
      panX: drag.panX + (clientX - drag.startX),
      panY: drag.panY + (clientY - drag.startY),
    }));
  }

  endDrag() { this.isDragging.set(false); }

  /** Pinch: scale from the start view by `ratio` around the start midpoint, following the midpoint as it moves. */
  pinch(start: View, startMid: { x: number; y: number }, ratio: number, mid: { x: number; y: number }) {
    const zoomed = zoomAround(this.viewport(), start, start.zoom * ratio, startMid.x, startMid.y);
    if (zoomed.zoom === 1) { this.apply(zoomed); return; }
    this.apply(clampView(this.viewport(), { ...zoomed, panX: zoomed.panX + mid.x - startMid.x, panY: zoomed.panY + mid.y - startMid.y }));
  }

  snapshot(): View { return this.view(); }
}
