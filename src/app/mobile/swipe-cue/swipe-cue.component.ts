import { Component, computed, inject } from '@angular/core';
import { StripService } from '../../services/strip.service';
import { SNAP_RATIO } from '../../gestures/gestures';
import { turnsPage } from '../../strip/strip';
import { SHOW_CUE_FROM } from '../../services/strip.service';

/** Mobile, mid-swipe: how far is left to the snap mark (the reader tags the incoming page). Visual only: the
 *  swipe itself is the input. */
@Component({
  selector: 'app-swipe-cue',
  host: { class: 'contents', 'aria-hidden': 'true' },
  template: `
    @if (cue(); as c) {
      <div class="pnl pointer-events-none fixed inset-x-5 bottom-[max(36px,env(safe-area-inset-bottom))] z-30 gap-2.5 px-4 py-3.5 shadow-hard-sm">
        <div class="flex items-baseline justify-between">
          <span class="font-bold">{{ c.text }}</span>
          @if (c.turnable) { <span class="font-mono text-xs text-dim">{{ c.pct }}%</span> }
        </div>
        @if (c.turnable) {
          <div class="relative h-2 bg-surface-3">
            <i class="absolute inset-y-0 left-0 bg-paper" [style.width.%]="c.pct"></i>
            <i class="absolute -inset-y-[5px] w-[3px] bg-shu" [style.left.%]="snap"></i>
          </div>
        }
      </div>
    }
  `,
})
export class SwipeCueComponent {
  private strip = inject(StripService);
  protected readonly snap = SNAP_RATIO * 100;

  protected readonly cue = computed(() => {
    const dx = this.strip.dragX();
    if (!this.strip.dragging() || Math.abs(dx) < SHOW_CUE_FROM) return null;
    const item = this.strip.items().find(i => i.k === (dx < 0 ? 1 : -1));
    if (!item) return null;
    const turnable = turnsPage(item);
    const pct = Math.min(100, Math.round((Math.abs(dx) / Math.max(1, Math.abs(item.x))) * 100));
    const armed = this.strip.armedKey() === item.key;
    const text = turnable ? (armed ? 'Let go to turn' : 'Keep going to turn')
      : item.kind === 'teaser' ? "That's the chapter's last page"
      : item.kind !== 'empty' ? `Start of chapter ${item.chapter + 1}`
      : item.chapter > 1 ? `Start of chapter ${item.chapter}` : 'No earlier page';
    return { turnable, pct, text };
  });
}
