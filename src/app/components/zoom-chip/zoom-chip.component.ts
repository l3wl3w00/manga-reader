import { Component, booleanAttribute, inject, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ZoomService, ZOOM_STEP } from '../../services/zoom.service';
import { ICONS } from '../../ui/icons';

/** Zoom level with step buttons; while zoomed it also offers fit (auto-fit framing) and reset. */
@Component({
  selector: 'app-zoom-chip',
  imports: [LucideAngularModule],
  host: { class: 'flex items-center gap-2' },
  template: `
    @if (!compact() && zoom.isZoomed() && !zoom.autoFit()) {
      <span class="tag tag-gold px-2 py-1.5" animate.enter="a-pop-in" animate.leave="a-pop-out">Auto-fit off</span>
    }
    <div class="flex items-stretch border-2 border-paper bg-surface-1 shadow-hard-sm" [class]="compact() ? 'h-12' : 'h-10'"
      role="group" aria-label="Zoom">
      @if (!compact()) {
        <button class="chip-btn" (click)="zoom.setZoom(zoom.zoom() - step, center().x, center().y)" aria-label="Zoom out">
          <lucide-icon [img]="icons.minus" [size]="18" />
        </button>
      }
      <b class="flex items-center px-2.5 font-mono font-bold" [class]="compact() ? 'text-[15px]' : 'text-[13px] border-x-2 border-line'"
        [class.text-shu]="zoom.isZoomed()" aria-live="polite">{{ zoom.percent() }}%</b>
      @if (!compact()) {
        <button class="chip-btn" (click)="zoom.setZoom(zoom.zoom() + step, center().x, center().y)" aria-label="Zoom in">
          <lucide-icon [img]="icons.plus" [size]="18" />
        </button>
      }
      @if (zoom.isZoomed() || compact()) {
        <button class="chip-btn border-l-2 border-line" [class]="compact() ? 'w-12' : 'w-10'" (click)="zoom.fitPage()"
          aria-label="Fit page to screen" title="Fit page (auto-fit framing)">
          <lucide-icon [img]="icons.scan" [size]="18" />
        </button>
      }
      @if (zoom.isZoomed() && !compact()) {
        <button class="chip-btn w-10 border-l-2 border-line" (click)="zoom.resetZoom()" aria-label="Reset zoom to 100%" title="Reset to 100%">
          <lucide-icon [img]="icons.reset" [size]="18" />
        </button>
      }
    </div>
  `,
  styles: `
    .chip-btn { display: flex; width: 36px; align-items: center; justify-content: center; transition: background-color 120ms; }
    .chip-btn:hover { background: var(--color-surface-2); }
    .chip-btn:active lucide-icon { transform: scale(0.85); }
  `,
})
export class ZoomChipComponent {
  protected zoom = inject(ZoomService);
  protected readonly icons = ICONS;
  protected readonly step = ZOOM_STEP;
  /** Mobile: level and fit only, larger targets. */
  readonly compact = input(false, { transform: booleanAttribute });

  protected center() { return { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }
}
