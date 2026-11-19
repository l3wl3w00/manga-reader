import { Component, booleanAttribute, inject, input } from '@angular/core';
import { ReaderService } from '../../services/reader.service';
import { ZoomService } from '../../services/zoom.service';

/** Whole-page overview while zoomed, with the visible window outlined in shu. */
@Component({
  selector: 'app-minimap',
  host: { '[class]': "'pnl shadow-hard-sm ' + (compact() ? 'p-1.5' : 'gap-2 p-2.5')", 'aria-label': 'Page overview', role: 'img' },
  template: `
    <div class="relative overflow-hidden bg-paper" [class]="compact() ? 'w-[70px]' : 'w-28'" [style.aspect-ratio]="aspect()">
      <img [src]="reader.imgSrc()" referrerpolicy="no-referrer" alt="" draggable="false" class="size-full object-contain opacity-80" />
      @if (zoom.region(); as r) {
        <span class="absolute border-shu bg-shu/18" [class]="compact() ? 'border-2' : 'border-[3px]'"
          [style.left.%]="r.x * 100" [style.top.%]="r.y * 100" [style.width.%]="r.w * 100" [style.height.%]="r.h * 100"></span>
      }
    </div>
    @if (!compact()) {
      <span class="lbl text-center">Page {{ reader.page().toString().padStart(2, '0') }}</span>
    }
  `,
})
export class MinimapComponent {
  protected reader = inject(ReaderService);
  protected zoom = inject(ZoomService);
  readonly compact = input(false, { transform: booleanAttribute });

  protected aspect() {
    const img = this.zoom.imageSize();
    return img ? `${img.w} / ${img.h}` : '7 / 10';
  }
}
