import { Component, computed, inject, model } from '@angular/core';
import { ReaderService } from '../../services/reader.service';
import { pageAt } from '../../gestures/gestures';

/** Above this many pages the ticks get too thin: draw a track with a thumb. */
const MAX_TICKS = 40;

/** Drag along the chapter's pages; release to go there. Needs the chapter length. */
@Component({
  selector: 'app-page-scrubber',
  host: {
    class: 'block touch-none py-3.5 px-4',
    role: 'slider', tabindex: '0', 'aria-label': 'Page',
    '[attr.aria-valuemin]': '1', '[attr.aria-valuemax]': 'total()', '[attr.aria-valuenow]': 'shown()',
    '[attr.aria-disabled]': '!total()',
    '(pointerdown)': 'down($event)', '(pointermove)': 'move($event)', '(pointerup)': 'up($event)', '(pointercancel)': 'cancel()',
    '(keydown.arrowright)': 'reader.goToPage(reader.page() + 1)', '(keydown.arrowleft)': 'reader.goToPage(reader.page() - 1)',
  },
  template: `
    @if (ticks(); as t) {
      <div class="flex h-3.5 items-center gap-[3px]" aria-hidden="true">
        @for (n of t; track n) {
          <i class="h-2 flex-1 transition-[background-color,transform] duration-150"
            [class]="n === shown() ? 'bg-paper scale-y-[1.75]' : n < shown() ? 'bg-shu' : 'bg-surface-3'"></i>
        }
      </div>
    } @else if (total()) {
      <div class="relative h-3.5" aria-hidden="true">
        <span class="absolute inset-x-0 top-[3px] h-2 bg-surface-3"></span>
        <span class="absolute left-0 top-[3px] h-2 w-full origin-left bg-shu" [style.transform]="'scaleX(' + (shown() / total()) + ')'"></span>
        <span class="absolute top-0 h-3.5 w-2 -translate-x-1/2 bg-paper" [style.left.%]="(shown() / total()) * 100"></span>
      </div>
    } @else {
      <!-- Chapter length not known yet: a plain empty track; it fills in once the last page has been seen. -->
      <div class="h-3.5 py-[3px]" aria-hidden="true" data-track="unknown"><div class="h-2 bg-surface-3"></div></div>
    }
  `,
})
export class PageScrubberComponent {
  protected reader = inject(ReaderService);
  /** The page under the finger while scrubbing, null otherwise. */
  readonly preview = model<number | null>(null);

  protected readonly total = computed(() => this.reader.totalPages() ?? 0);
  protected readonly shown = computed(() => this.preview() ?? this.reader.shown().page);
  protected readonly ticks = computed(() => {
    const tp = this.total();
    return tp && tp <= MAX_TICKS ? Array.from({ length: tp }, (_, i) => i + 1) : null;
  });

  private track(e: PointerEvent) {
    const el = e.currentTarget as HTMLElement, r = el.getBoundingClientRect();
    const pad = 16;
    return pageAt(e.clientX - r.left - pad, r.width - pad * 2, this.total());
  }

  protected down(e: PointerEvent) {
    if (!this.total()) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.preview.set(this.track(e));
  }
  protected move(e: PointerEvent) { if (this.preview() !== null) this.preview.set(this.track(e)); }
  protected up(e: PointerEvent) {
    if (this.preview() === null) return;
    const pg = this.track(e);
    this.preview.set(null);
    this.reader.goToPage(pg);
  }
  protected cancel() { this.preview.set(null); }
}
