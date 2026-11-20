import { Component, computed, inject } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { ReaderService } from '../../services/reader.service';
import { LibraryService } from '../../services/library.service';
import { LayoutService } from '../../services/layout.service';
import { UiService } from '../../services/ui.service';
import { ICONS } from '../../ui/icons';
import { SourceService } from '../../services/source.service';

/** The manga, chapter or first page does not exist. */
@Component({
  selector: 'app-not-found',
  imports: [LucideDynamicIcon],
  host: { class: 'flex flex-col justify-center-safe', '[class.min-h-0]': 'layout.mobile()' },
  template: `
    @let mobile = layout.mobile();
    @let m = reader.missed();
    <div class="a-stagger flex flex-col" [class]="mobile ? 'flex-1 justify-center gap-4 px-5' : 'mx-auto w-full max-w-[880px] gap-[22px]'">
      <div class="dsp halftone bg-clip-text text-transparent" aria-hidden="true"
        [class]="mobile ? '-ml-1 text-[132px] leading-[0.9] [--dot:2.2px]' : '-ml-2 text-[clamp(140px,18vw,260px)] leading-[0.9] [--dot:2.6px] [--grid:10px]'">404</div>
      <h1 class="dsp" [class]="mobile ? 'text-[30px]' : 'text-[clamp(32px,3.1vw,44px)]'">This page @if (mobile) {<br />}isn't there.</h1>
      <p class="self-start border-2 border-line bg-surface-1 font-mono" [class]="mobile ? 'self-stretch px-3 py-2.5 text-[13px] leading-[1.6]' : 'px-3.5 py-2.5 text-sm'">
        <span class="text-gold">{{ m?.manga }}</span>
        @if (mobile) { <br /> } @else { <span class="text-mute"> / </span> }
        chapter {{ m?.chapter }} <span class="text-mute">/</span> page {{ m?.page }}
      </p>
      <ul class="flex max-w-[560px] flex-col gap-2 text-dim" [class]="mobile ? 'text-[15px]' : 'text-base'">
        <li class="flex gap-3"><span class="font-mono text-shu">1</span>Check the {{ mobile ? 'name' : 'manga name' }}. It has to match the site's spelling.</li>
        <li class="flex gap-3"><span class="font-mono text-shu">2</span>Check the chapter and page numbers.</li>
        <li class="flex gap-3"><span class="font-mono text-shu">3</span>The image host may be {{ mobile ? 'down' : 'slow or down' }}. Try again in a moment.</li>
        @if (source.imageEdited()) {
          <li class="flex gap-3"><span class="font-mono text-shu">4</span>Your page address is a custom one. Check it in Settings › Source.</li>
        }
      </ul>
      @if (!mobile) {
        <div class="flex flex-wrap gap-3.5 pt-2">
          @if (source.searchSite(); as site) {
            <button class="btn btn-primary btn-lg" (click)="search()">Search on {{ site }}<svg [lucideIcon]="icons.externalLink" [size]="18" /></button>
          }
          <button class="btn btn-lg" (click)="reader.retry()"><svg [lucideIcon]="icons.reset" [size]="18" />Try again</button>
          @if (backLabel(); as label) {
            <button class="btn btn-lg btn-ghost" (click)="reader.backToLastGood()">{{ label }}</button>
          }
        </div>
      }
    </div>
    @if (mobile) {
      <div class="flex shrink-0 flex-col gap-3 px-5 pt-5 pb-7">
        @if (source.searchSite(); as site) {
          <button class="btn btn-primary btn-lg mr-1" (click)="search()">Search on {{ site }}<svg [lucideIcon]="icons.externalLink" [size]="18" /></button>
        }
        <div class="flex gap-3" [class.mt-1]="source.searchSite()">
          <button class="btn btn-lg flex-1" (click)="reader.retry()"><svg [lucideIcon]="icons.reset" [size]="18" />Try again</button>
          <button class="btn btn-lg flex-1" (click)="ui.openSheet('jump')">Edit entry</button>
        </div>
      </div>
    }
  `,
})
export class NotFoundComponent {
  protected reader = inject(ReaderService);
  protected layout = inject(LayoutService);
  protected ui = inject(UiService);
  private lib = inject(LibraryService);
  protected source = inject(SourceService);
  protected readonly icons = ICONS;

  protected readonly backLabel = computed(() => {
    const g = this.reader.lastGood();
    return g ? `Back to ${this.lib.formatName(g.manga)}, CH ${g.chapter}` : null;
  });

  protected search() {
    const m = this.reader.missed();
    const url = m ? this.source.searchUrl(m.manga) : null;
    if (url) window.open(url, '_blank', 'noopener');
  }
}
