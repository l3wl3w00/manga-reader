import { Component, inject } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { ReaderService } from '../../services/reader.service';
import { KeybindingsService } from '../../services/keybindings.service';
import { LayoutService } from '../../services/layout.service';
import { ICONS } from '../../ui/icons';

/** Walked past the chapter's last page with a page-only control: offer the next chapter.
 *  Stamped onto the dimmed last page on desktop, a bottom sheet on mobile. */
@Component({
  selector: 'app-end-of-chapter',
  imports: [LucideDynamicIcon],
  host: { class: 'fixed inset-0 z-40', 'animate.leave': 'x-leave' },
  template: `
    @let mobile = layout.mobile();
    <div class="absolute inset-0 bg-ink/80" animate.enter="a-fade-in" data-leave="fade" (click)="reader.backFromEnd()"></div>
    <section class="pnl absolute" aria-label="End of chapter" aria-live="polite"
      [class]="mobile ? 'inset-x-0 bottom-0 mx-auto max-w-xl border-x-0 border-b-0 shadow-none pb-[env(safe-area-inset-bottom)] after:absolute after:inset-x-0 after:top-full after:h-24 after:bg-surface-1' : 'left-1/2 top-1/2 w-[min(600px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2'"
      [animate.enter]="mobile ? 'a-sheet-in' : 'a-stamp-in'" [attr.data-leave]="mobile ? 'sheet' : 'pop'">
      <div class="halftone shrink-0 border-b-2 border-paper bg-surface-2" [class]="mobile ? 'h-7' : 'h-11'" aria-hidden="true"></div>
      <div class="flex flex-col" [class]="mobile ? 'gap-3.5 px-5 pt-[22px] pb-7' : 'gap-[18px] px-8 pt-7 pb-8'">
        <span class="tag self-start text-dim">Page {{ reader.missed()?.page }} doesn't exist</span>
        <h1 class="dsp" [class]="mobile ? 'text-4xl' : 'text-display-lg'">End of<br />chapter {{ reader.chapter() }}</h1>
        <p class="leading-normal text-dim" [class]="mobile ? 'text-[15px]' : 'text-base'">
          That was page {{ reader.totalPages() }}, the last one.
          {{ mobile ? 'Swipes only turn pages, so they stop here.' : 'Clicking a neighbouring page only turns pages, so it stops here.' }}
        </p>
        <div class="flex gap-3.5 pt-1.5" [class.flex-col]="mobile">
          <button class="btn btn-primary btn-lg" [class.flex-1]="!mobile" [class.mr-1]="mobile" (click)="reader.nextChapter()">
            Chapter {{ reader.chapter() + 1 }}<svg [lucideIcon]="icons.arrowRight" [size]="18" />
          </button>
          <button class="btn btn-lg" (click)="reader.backFromEnd()">Back to page {{ reader.totalPages() }}</button>
        </div>
        @if (!mobile) {
          <div class="mt-1 flex items-center gap-2 border-t border-line pt-4 text-[13px] text-dim">
            <span class="key">{{ kb.keyFor('nextPage') }}</span>
            <span>and the bottom bar's Page button roll straight into the next chapter.</span>
          </div>
        }
      </div>
    </section>
  `,
})
export class EndOfChapterComponent {
  protected reader = inject(ReaderService);
  protected kb = inject(KeybindingsService);
  protected layout = inject(LayoutService);
  protected readonly icons = ICONS;
}
