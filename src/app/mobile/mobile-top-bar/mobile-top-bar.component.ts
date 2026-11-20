import { Component, computed, inject } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { ReaderService } from '../../services/reader.service';
import { LibraryService } from '../../services/library.service';
import { ZoomService } from '../../services/zoom.service';
import { UiService } from '../../services/ui.service';
import { ICONS } from '../../ui/icons';

/** Mobile reading controls, top: library, title, auto-fit and settings. */
@Component({
  selector: 'app-mobile-top-bar',
  imports: [LucideDynamicIcon],
  host: { class: 'flex h-15 items-center gap-1 border-b-2 border-paper bg-surface-1 px-1.5 pt-[env(safe-area-inset-top)] box-content' },
  template: `
    <button class="ib ib-lg text-paper" (click)="ui.openSheet('library')" aria-label="Open library"><svg [lucideIcon]="icons.library" [size]="20" /></button>
    <button class="min-w-0 flex-1 px-1 text-left" (click)="ui.openSheet('jump')" aria-label="Jump to a chapter or page">
      <div class="truncate text-[15px] font-bold">{{ title() }}</div>
      <div class="font-mono text-[11px] tracking-[0.1em] text-mute">CHAPTER {{ reader.chapter() }}</div>
    </button>
    <button class="ib ib-lg" [class.ib-on]="zoom.autoFit()" (click)="zoom.toggleAutoFit()" [attr.aria-pressed]="zoom.autoFit()"
      aria-label="Auto-fit zoom on page turn"><svg [lucideIcon]="icons.scan" [size]="20" /></button>
    <button class="ib ib-lg text-paper" (click)="ui.openSettings()" aria-label="Settings"><svg [lucideIcon]="icons.settings" [size]="20" /></button>
  `,
})
export class MobileTopBarComponent {
  protected reader = inject(ReaderService);
  protected zoom = inject(ZoomService);
  protected ui = inject(UiService);
  private lib = inject(LibraryService);
  protected readonly icons = ICONS;
  protected readonly title = computed(() => this.lib.formatName(this.reader.manga()));
}
