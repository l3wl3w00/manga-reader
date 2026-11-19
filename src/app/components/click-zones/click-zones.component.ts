import { Component, computed, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ReaderService } from '../../services/reader.service';
import { UiService } from '../../services/ui.service';
import { ZoomService } from '../../services/zoom.service';
import { ICONS } from '../../ui/icons';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Desktop click zones: left and right 28% turn pages only (never into another chapter),
 *  the middle 44% locks or unlocks the panels. Hovering an edge shows where it goes. */
@Component({
  selector: 'app-click-zones',
  imports: [LucideAngularModule],
  host: { class: 'fixed inset-0 z-10 flex', 'data-stage': '' },
  template: `
    <button tabindex="-1" class="zone group w-[28%] items-start border-r-2 cursor-w-resize" [class.hoverable]="hoverable() && reader.page() > 1"
      (click)="reader.prevPage()" aria-label="Previous page (this chapter only)">
      <span class="zone-hint items-start">
        <lucide-icon [img]="icons.chevronLeft" [size]="48" [strokeWidth]="1.5" class="zone-arrow -translate-x-1" />
        <span class="dsp text-lg">Page {{ pad2(reader.page() - 1) }}</span>
        <span class="tag text-dim">Page only</span>
      </span>
    </button>
    <button tabindex="-1" class="flex-1 cursor-default outline-none" (click)="ui.togglePanels()"
      [attr.aria-label]="ui.panelsLocked() ? 'Unlock panels' : 'Lock panels'"></button>
    <button tabindex="-1" class="zone group w-[28%] items-end border-l-2 cursor-e-resize" [class.hoverable]="hoverable()"
      (click)="reader.nextPage()" aria-label="Next page (this chapter only)">
      <span class="zone-hint items-end">
        <lucide-icon [img]="icons.chevronRight" [size]="48" [strokeWidth]="1.5" class="zone-arrow translate-x-1" />
        <span class="dsp text-lg">{{ nextLabel() }}</span>
        <span class="tag text-dim">Page only</span>
      </span>
    </button>
  `,
  styles: `
    .zone { outline: none; display: flex; flex-direction: column; justify-content: center; padding: 0 28px; border-style: dashed;
      border-color: transparent; background: transparent; transition: border-color 160ms, background-color 160ms; }
    .zone-hint { display: flex; flex-direction: column; gap: 10px; opacity: 0; transition: opacity 140ms ease-out; }
    .zone-arrow { transition: transform 220ms var(--ease-spring); }
    .hoverable:hover { border-color: rgb(244 241 234 / 0.28); }
    .hoverable.items-end:hover { background: linear-gradient(270deg, rgb(244 241 234 / 0.14), rgb(244 241 234 / 0.02)); }
    .hoverable.items-start:hover { background: linear-gradient(90deg, rgb(244 241 234 / 0.14), rgb(244 241 234 / 0.02)); }
    .hoverable:hover .zone-hint { opacity: 1; }
    .hoverable:hover .zone-arrow { transform: none; }
    :host-context(html[data-motion="reduced"]) .zone-arrow { transition: none; }
  `,
})
export class ClickZonesComponent {
  protected reader = inject(ReaderService);
  protected ui = inject(UiService);
  private zoom = inject(ZoomService);
  protected readonly icons = ICONS;
  protected readonly pad2 = pad2;

  /** No hover hints while zoomed (dragging) or with the panels up. */
  protected readonly hoverable = computed(() =>
    !this.zoom.isZoomed() && !this.ui.showPanels() && this.reader.screen() === 'image');
  protected readonly nextLabel = computed(() =>
    this.reader.atLastPage() ? 'Last page' : `Page ${pad2(this.reader.page() + 1)}`);
}
