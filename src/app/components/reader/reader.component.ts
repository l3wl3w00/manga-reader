import { Component, inject, HostListener, ElementRef, viewChild } from '@angular/core';
import { ReaderService } from '../../services/reader.service';
import { ZoomService, ZOOM_STEP } from '../../services/zoom.service';

@Component({
  selector: 'app-reader',
  imports: [],
  templateUrl: './reader.component.html',
})
export class ReaderComponent {
  reader = inject(ReaderService);
  zoom   = inject(ZoomService);

  private drag: { startX: number; startY: number; panX: number; panY: number } | null = null;

  get cursor() {
    if (this.zoom.zoom() <= 1) return '';
    return this.zoom.isDragging() ? 'grabbing' : 'grab';
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    this.zoom.mouseX.set(e.clientX);
    this.zoom.mouseY.set(e.clientY);
    if (this.drag) {
      this.zoom.doDrag(this.drag, e.clientX, e.clientY);
    }
  }

  @HostListener('document:mousedown', ['$event'])
  onMouseDown(e: MouseEvent) {
    if (this.zoom.zoom() <= 1) return;
    const t = e.target as HTMLElement;
    if (t.closest('button, input, #topbar, app-settings-modal')) return;
    this.drag = this.zoom.startDrag(e.clientX, e.clientY);
    e.preventDefault();
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    if (this.drag) { this.drag = null; this.zoom.endDrag(); }
  }

  @HostListener('document:wheel', ['$event'])
  onWheel(e: WheelEvent) {
    if (!this.reader.manga()) return;
    const t = e.target as HTMLElement;
    if (t.closest('.scrollbar, #topbar, #bottombar')) return;
    e.preventDefault();
    this.zoom.setZoom(this.zoom.zoom() + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  }
}
