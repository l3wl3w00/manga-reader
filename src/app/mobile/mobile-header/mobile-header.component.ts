import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { UiService } from '../../services/ui.service';
import { ICONS } from '../../ui/icons';

/** Mobile brand bar for the screens with nothing to read (welcome, not found). */
@Component({
  selector: 'app-mobile-header',
  imports: [LucideAngularModule],
  host: { class: 'flex h-15 shrink-0 items-center gap-2.5 border-b-2 border-paper bg-surface-1 pl-4 pr-1.5 pt-[env(safe-area-inset-top)]' },
  template: `
    <span class="inline-flex size-7 shrink-0 items-center justify-center bg-shu font-display text-[17px] leading-none text-ink" aria-hidden="true">読</span>
    <span class="dsp mr-auto text-[15px]">Manga Reader</span>
    <button class="ib ib-lg text-paper" (click)="ui.openSheet('library')" aria-label="Open library"><lucide-icon [img]="icons.library" [size]="20" /></button>
    <button class="ib ib-lg text-paper" (click)="ui.openSettings()" aria-label="Settings"><lucide-icon [img]="icons.settings" [size]="20" /></button>
  `,
})
export class MobileHeaderComponent {
  protected ui = inject(UiService);
  protected readonly icons = ICONS;
}
