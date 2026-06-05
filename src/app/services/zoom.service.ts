import { Injectable, signal, computed } from '@angular/core';

const MIN_ZOOM = 1, MAX_ZOOM = 4, ZOOM_STEP = 0.15;
export { ZOOM_STEP };
export const PAN_STEP = 80;

const AUTOZOOM_STORAGE = 'manga-reader-autozoom';
const FITZOOM_STORAGE  = 'manga-reader-fitzoom';

@Injectable({ providedIn: 'root' })
export class ZoomService {
  zoom   = signal(1);
  panX   = signal(0);
  panY   = signal(0);
  mouseX = signal(window.innerWidth / 2);
  mouseY = signal(window.innerHeight / 2);
  isDragging = signal(false);

  autoFit = signal(JSON.parse(localStorage.getItem(AUTOZOOM_STORAGE) || 'false') as boolean);
  fitSettings = signal<{ heightPct: number; maxWidthPct: number }>({
    heightPct: 60, maxWidthPct: 90,
    ...JSON.parse(localStorage.getItem(FITZOOM_STORAGE) || '{}'),
  });

  transform = computed(() =>
    `translate(${this.panX()}px,${this.panY()}px) scale(${this.zoom()})`
  );

  saveFitSettings() {
    localStorage.setItem(FITZOOM_STORAGE, JSON.stringify(this.fitSettings()));
  }

  toggleAutoFit() {
    this.autoFit.update(v => !v);
    localStorage.setItem(AUTOZOOM_STORAGE, JSON.stringify(this.autoFit()));
  }

  updateFitSettings(heightPct: number, maxWidthPct: number) {
    this.fitSettings.set({ heightPct, maxWidthPct });
    this.saveFitSettings();
  }

  clampPan() {
    const vw = window.innerWidth, vh = window.innerHeight, z = this.zoom();
    this.panX.set(Math.max(vw * (1 - z), Math.min(0, this.panX())));
    this.panY.set(Math.max(vh * (1 - z), Math.min(0, this.panY())));
  }

  setZoom(nz: number) {
    nz = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nz));
    const z = this.zoom(), mx = this.mouseX(), my = this.mouseY();
    if (nz === MIN_ZOOM) { this.panX.set(0); this.panY.set(0); }
    else {
      const sc = nz / z;
      this.panX.set(mx - (mx - this.panX()) * sc);
      this.panY.set(my - (my - this.panY()) * sc);
    }
    this.zoom.set(nz);
    this.clampPan();
  }

  resetZoom() { this.zoom.set(1); this.panX.set(0); this.panY.set(0); }

  autoFitZoom(iw: number, ih: number) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const scale = Math.min(vw / iw, vh / ih);
    const rw = iw * scale, rh = ih * scale;
    const ry = (vh - rh) / 2;
    const fs = this.fitSettings();
    const nz = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM,
      Math.min((fs.maxWidthPct / 100) * vw / rw, vh / ((fs.heightPct / 100) * rh))
    ));
    this.zoom.set(nz);
    this.panX.set(vw * (1 - nz) / 2);
    this.panY.set(-ry * nz);
    this.clampPan();
  }

  startDrag(clientX: number, clientY: number): { startX: number; startY: number; panX: number; panY: number } {
    this.isDragging.set(true);
    return { startX: clientX, startY: clientY, panX: this.panX(), panY: this.panY() };
  }

  doDrag(drag: { startX: number; startY: number; panX: number; panY: number }, clientX: number, clientY: number) {
    this.panX.set(drag.panX + (clientX - drag.startX));
    this.panY.set(drag.panY + (clientY - drag.startY));
    this.clampPan();
  }

  endDrag() { this.isDragging.set(false); }
}
