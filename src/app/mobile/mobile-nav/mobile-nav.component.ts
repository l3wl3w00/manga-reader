import { Component, computed, inject, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { ReaderService } from '../../services/reader.service';
import { UiService } from '../../services/ui.service';
import { ICONS } from '../../ui/icons';
import { PageScrubberComponent } from '../page-scrubber/page-scrubber.component';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Mobile reading controls, bottom (in thumb reach): page scrubber and navigation.
 *  Unlike swipes, these buttons cross chapters. */
@Component({
  selector: 'app-mobile-nav',
  imports: [LucideDynamicIcon, PageScrubberComponent],
  host: { class: 'block border-t-2 border-paper bg-surface-1 pb-[env(safe-area-inset-bottom)]' },
  template: `
    @let ch = reader.chapter();
    @let busy = reader.busy();
    <app-page-scrubber class="border-b-2 border-line" [(preview)]="scrub" />
    <nav class="flex h-16" aria-label="Page navigation">
      <button class="nav-btn nav-col" [attr.aria-disabled]="busy || ch <= 1" (click)="reader.prevChapter()"
        [attr.aria-label]="ch > 1 ? 'Previous chapter, ' + (ch - 1) : 'No previous chapter'">
        <svg [lucideIcon]="icons.chevronsLeft" [size]="18" /><span>{{ ch > 1 ? 'CH ' + (ch - 1) : 'First ch' }}</span>
      </button>
      <button class="nav-btn nav-col" [attr.aria-disabled]="busy || atStart()" (click)="reader.prevPageFull()" aria-label="Previous page">
        <svg [lucideIcon]="icons.chevronLeft" [size]="18" /><span>Page</span>
      </button>
      <button class="nav-btn nav-col flex-[1.5] text-paper" (click)="ui.openSheet('jump')"
        [attr.aria-label]="'Page ' + reader.shown().page + (reader.shownTotal() ? ' of ' + reader.shownTotal() : ', chapter length not known yet') + '. Jump to a page'">
        <span class="font-mono text-[17px] tracking-normal normal-case">
          {{ pad2(scrub() ?? reader.shown().page) }}<span class="text-mute"> / {{ reader.shownTotal() ?? '?' }}</span>
        </span>
        <span class="text-shu">Jump</span>
      </button>
      <button class="nav-btn nav-col" [class.nav-next]="!busy && !reader.atLastPage()" [class.nav-hot]="!busy && reader.atLastPage()"
        [attr.aria-disabled]="busy" (click)="reader.nextPageFull()"
        [attr.aria-label]="reader.atLastPage() ? 'Next page: chapter ' + (ch + 1) : 'Next page'">
        <svg [lucideIcon]="reader.atLastPage() ? icons.arrowRight : icons.chevronRight" [size]="18" />
        <span>{{ reader.atLastPage() ? 'Next ch' : 'Page' }}</span>
      </button>
      <button class="nav-btn nav-col" [attr.aria-disabled]="busy" (click)="reader.nextChapter()" [attr.aria-label]="'Next chapter, ' + (ch + 1)">
        <svg [lucideIcon]="icons.chevronsRight" [size]="18" /><span>CH {{ ch + 1 }}</span>
      </button>
    </nav>
  `,
})
export class MobileNavComponent {
  protected reader = inject(ReaderService);
  protected ui = inject(UiService);
  protected readonly icons = ICONS;
  protected readonly pad2 = pad2;
  protected readonly scrub = signal<number | null>(null);
  protected readonly atStart = computed(() => this.reader.page() <= 1 && this.reader.chapter() <= 1);
}
