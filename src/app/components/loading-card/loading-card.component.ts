import { Component, inject } from '@angular/core';
import { ReaderService } from '../../services/reader.service';

/** Shown over the skeleton when a page is slow to arrive. */
@Component({
  selector: 'app-loading-card',
  host: {
    class: 'pnl fixed left-1/2 top-1/2 z-40 w-[300px] -translate-x-1/2 -translate-y-1/2 gap-3 px-5 py-[18px] mobile:w-[260px] mobile:px-[18px] mobile:py-4',
    role: 'status',
  },
  template: `
    <div class="flex items-baseline justify-between">
      <span class="dsp text-xl">Page {{ reader.page().toString().padStart(2, '0') }}</span>
      <span class="lbl text-shu">Loading</span>
    </div>
    <div class="a-seg flex gap-1" aria-hidden="true">
      @for (i of segments; track i) { <i class="h-2.5 flex-1 bg-surface-3" [style.--i]="i"></i> }
    </div>
    <span class="font-mono text-[11px] text-mute mobile:hidden">{{ reader.manga() }} · ch {{ reader.chapter() }}</span>
  `,
})
export class LoadingCardComponent {
  protected reader = inject(ReaderService);
  protected readonly segments = [0, 1, 2, 3, 4, 5];
}
