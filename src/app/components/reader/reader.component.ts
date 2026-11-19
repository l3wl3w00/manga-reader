import { Component, DestroyRef, computed, inject } from '@angular/core';
import { ReaderService } from '../../services/reader.service';
import { ZoomService, ZOOM_STEP, DragStart } from '../../services/zoom.service';
import { LayoutService } from '../../services/layout.service';
import { PageArtComponent } from '../../ui/page-art/page-art.component';
import { TYPICAL_PAGE, clearRailOffset } from '../../services/zoom-math';
import { UiService } from '../../services/ui.service';

/** Right edge of the desktop rail (24px margin + 336px panels) plus a 24px gap. */
const RAIL_EDGE = 384;

/** A mouse drag longer than this is a pan, not a click on a page-turn zone. */
const CLICK_SLOP = 5;

/** The page: image in the zoom root, or its screentone skeleton while a page is slow to arrive.
 *  Owns desktop mouse zoom (wheel toward the cursor) and drag-pan. */
@Component({
  selector: 'app-reader',
  imports: [PageArtComponent],
  host: {
    class: 'fixed inset-0 block',
    'data-stage': '',
    '[style.cursor]': 'cursor()',
    '(document:mousemove)': 'onMouseMove($event)',
    '(document:mousedown)': 'onMouseDown($event)',
    '(document:mouseup)': 'onMouseUp()',
    '(document:wheel)': 'onWheel($event)',
  },
  template: `
    <div class="vt-page absolute inset-0 overflow-hidden transition-transform duration-300 ease-spring-soft"
      [style.transform]="railOffset() ? 'translateX(' + railOffset() + 'px)' : null">
      <div class="absolute inset-0 origin-top-left" [style.transform]="zoom.transform()">
        @if (showImage()) {
          <img [src]="reader.imgSrc()" referrerpolicy="no-referrer" alt="" draggable="false"
            class="pointer-events-none h-dvh w-screen object-contain" />
        }
      </div>
      @if (reader.screen() === 'loading') {
        <div class="absolute inset-0 flex items-center justify-center" animate.enter="a-fade-in">
          <div class="a-shimmer relative max-h-full max-w-full overflow-hidden" [style.aspect-ratio]="aspect()"
            [style.width]="'min(100vw, 100dvh * ' + aspect() + ')'">
            <app-page-art kind="skeleton" class="size-full" />
          </div>
        </div>
      }
    </div>
  `,
})
export class ReaderComponent {
  protected reader = inject(ReaderService);
  protected zoom = inject(ZoomService);
  private layout = inject(LayoutService);
  private ui = inject(UiService);

  private drag: (DragStart & { moved: boolean }) | null = null;
  private suppressClick = false;

  protected readonly showImage = computed(() => {
    const s = this.reader.screen();
    return !!this.reader.imgSrc() && (s === 'image' || s === 'end');
  });
  protected readonly aspect = computed(() => {
    const img = this.zoom.imageSize() ?? TYPICAL_PAGE;
    return +(img.w / img.h).toFixed(4);
  });
  /** At 100% with the desktop panels up, slide the page out from under them. */
  protected readonly railOffset = computed(() => {
    if (this.layout.mobile() || this.zoom.isZoomed() || !this.ui.showPanels()) return 0;
    return clearRailOffset(this.layout.viewport(), this.zoom.imageSize() ?? TYPICAL_PAGE, RAIL_EDGE);
  });

  protected readonly cursor = computed(() => {
    if (!this.zoom.isZoomed()) return '';
    return this.zoom.isDragging() ? 'grabbing' : 'grab';
  });

  constructor() {
    // A drag that ends over a click zone must not also turn the page.
    const swallowClick = (e: MouseEvent) => {
      if (!this.suppressClick) return;
      this.suppressClick = false;
      e.stopPropagation();
      e.preventDefault();
    };
    document.addEventListener('click', swallowClick, true);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('click', swallowClick, true));
  }

  protected onMouseMove(e: MouseEvent) {
    this.zoom.mouseX.set(e.clientX);
    this.zoom.mouseY.set(e.clientY);
    if (!this.drag) return;
    if (Math.hypot(e.clientX - this.drag.startX, e.clientY - this.drag.startY) > CLICK_SLOP) this.drag.moved = true;
    this.zoom.doDrag(this.drag, e.clientX, e.clientY);
  }

  protected onMouseDown(e: MouseEvent) {
    if (this.layout.mobile() || !this.zoom.isZoomed() || e.button !== 0) return;
    if (!(e.target as HTMLElement).closest('[data-stage]')) return;
    this.drag = { ...this.zoom.startDrag(e.clientX, e.clientY), moved: false };
    e.preventDefault();
  }

  protected onMouseUp() {
    if (!this.drag) return;
    this.suppressClick = this.drag.moved;
    // The click (if any) fires right after mouseup; never let the flag outlive it.
    setTimeout(() => (this.suppressClick = false));
    this.drag = null;
    this.zoom.endDrag();
  }

  protected onWheel(e: WheelEvent) {
    if (!this.reader.lastGood() || !(e.target as HTMLElement).closest('[data-stage]')) return;
    e.preventDefault();
    this.zoom.setZoom(this.zoom.zoom() + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP), e.clientX, e.clientY);
  }
}
