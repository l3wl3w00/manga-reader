import { Component, inject } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { UiService } from '../../services/ui.service';
import { ICONS } from '../../ui/icons';
import { JumpFormComponent } from '../jump-form/jump-form.component';

/** Desktop control panel: brand header with the panel lock (pin), and the jump form. */
@Component({
  selector: 'app-control-panel',
  imports: [LucideDynamicIcon, JumpFormComponent],
  host: { class: 'block shrink-0' },
  template: `
    <section class="pnl" [class.border-dashed]="ui.peekOnly()" [class.shadow-none]="ui.peekOnly()" aria-label="Controls">
      <header class="flex h-11 shrink-0 items-center gap-2.5 border-b-2 border-paper pl-3 pr-1.5">
        <span class="inline-flex size-7 shrink-0 items-center justify-center bg-shu font-display text-[17px] leading-none text-ink" aria-hidden="true">読</span>
        <h1 class="dsp mr-auto text-display-sm">Manga Reader</h1>
        @if (ui.peekOnly()) {
          <span class="tag text-gold mr-1" animate.enter="a-pop-in">Peek</span>
          <button class="ib" (click)="ui.panelsLocked.set(true)" aria-pressed="false"
            aria-label="Panels hide while reading. Lock them" title="Lock panels">
            <svg [lucideIcon]="icons.pinOff" [size]="18" />
          </button>
        } @else {
          <button class="ib" [class.ib-on]="ui.panelsLocked()" (click)="ui.togglePanels()" [attr.aria-pressed]="ui.panelsLocked()"
            [attr.aria-label]="ui.panelsLocked() ? 'Panels locked. Unlock to hide while reading' : 'Lock panels'"
            [title]="ui.panelsLocked() ? 'Unlock panels' : 'Lock panels'">
            <svg [lucideIcon]="ui.panelsLocked() ? icons.pin : icons.pinOff" [size]="18" />
          </button>
        }
      </header>
      <app-jump-form class="p-3.5" variant="panel" />
    </section>
  `,
})
export class ControlPanelComponent {
  protected ui = inject(UiService);
  protected readonly icons = ICONS;
}
