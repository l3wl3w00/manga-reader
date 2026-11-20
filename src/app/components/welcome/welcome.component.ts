import { Component, computed, inject } from '@angular/core';
import { KeybindingsService } from '../../services/keybindings.service';
import { LayoutService } from '../../services/layout.service';
import { SourceService } from '../../services/source.service';
import { PageArtComponent } from '../../ui/page-art/page-art.component';

/** First run, nothing loaded: how to start. */
@Component({
  selector: 'app-welcome',
  imports: [PageArtComponent],
  host: { class: 'relative flex flex-col justify-center-safe' },
  template: `
    @if (layout.mobile()) {
      <div class="halftone absolute -right-10 top-[30px] h-[243px] w-[170px] rotate-6 border-[3px] border-dashed border-line [--tone:var(--color-surface-3)] [--dot:1.2px] [--grid:7px] a-fade-in" aria-hidden="true"></div>
      <div class="a-stagger relative flex flex-col gap-4 px-5">
        <span class="tag self-start text-shu">Nothing loaded</span>
        <h1 class="dsp text-[50px]">Pick up<br />a story.</h1>
        <p class="max-w-[300px] text-base leading-normal text-dim">Type a manga name and press Go. What you read is kept in your library, with your place in every chapter.</p>
      </div>
    } @else {
      <div class="flex items-center justify-center gap-[clamp(24px,4vw,56px)]">
        <div class="a-stagger flex max-w-[520px] min-w-0 flex-1 flex-col gap-7">
          <span class="tag self-start text-shu">Nothing loaded</span>
          <h1 class="dsp text-[clamp(52px,6.2vw,84px)]">Pick up<br />a story.</h1>
          <p class="max-w-[460px] text-lg leading-normal text-dim">Type a manga name, choose a chapter and press Go. Or open a title from your library.</p>
          <ol class="flex flex-col border-2 border-paper">
            @for (step of steps(); track step.n) {
              <li class="flex items-baseline gap-4 border-b-2 border-line px-4 py-3.5 last:border-b-0">
                <span class="dsp text-xl text-shu">{{ step.n }}</span>
                <span><b>{{ step.title }}</b>&ngsp;<span class="text-dim">{{ step.text }}</span></span>
              </li>
            }
          </ol>
          <div class="flex flex-wrap items-center gap-[18px] text-xs text-dim">
            <span class="flex items-center gap-1.5"><span class="key">{{ kb.keyFor('peekPanels') }}</span> peek panels</span>
            <span class="flex items-center gap-1.5"><span class="key">{{ kb.keyFor('togglePanels') }}</span> lock panels</span>
            <span class="flex items-center gap-1.5"><span class="key">{{ kb.keyFor('fullscreen') }}</span> fullscreen</span>
          </div>
        </div>
        <div class="welcome-page relative hidden aspect-[380/543] w-[clamp(220px,24vw,380px)] shrink-0 xl:block" aria-hidden="true">
          <app-page-art kind="outline" class="size-full" />
          <span class="lbl absolute inset-x-0 bottom-[22%] text-center">Page 01 goes here</span>
        </div>
      </div>
    }
  `,
  styles: `
    .welcome-page { animation: drop-in 520ms var(--ease-spring) 120ms both; }
    @keyframes drop-in { from { opacity: 0; transform: rotate(-4deg) translateY(-24px); } to { transform: rotate(3deg); } }
    :host-context(html[data-motion="reduced"]) .welcome-page { animation: fade-in 120ms both; transform: rotate(3deg); }
  `,
})
export class WelcomeComponent {
  protected kb = inject(KeybindingsService);
  protected layout = inject(LayoutService);
  private source = inject(SourceService);
  protected readonly steps = computed(() => [
    { n: '01', title: 'Name it.', text: "Use the site's spelling." + (this.source.searchSite() ? ` Not sure? Search on ${this.source.searchSite()}.` : '') },
    { n: '02', title: 'Pick a spot.', text: 'Chapter and page both start at 1.' },
    { n: '03', title: 'Read.', text: 'Click the page beside this one to turn to it. The keys and the bottom bar roll on into the next chapter.' },
  ]);
}
