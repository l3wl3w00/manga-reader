import { Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { ReaderService } from '../../services/reader.service';
import { ZoomService, ZOOM_STEP, DragStart } from '../../services/zoom.service';
import { LayoutService } from '../../services/layout.service';
import { UiService } from '../../services/ui.service';
import { MotionService } from '../../services/motion.service';
import { AppearanceService } from '../../services/appearance.service';
import { PageTurnService, StripTurn } from '../../services/page-turn.service';
import { StripItem, StripService } from '../../services/strip.service';
import { PageArtComponent } from '../../ui/page-art/page-art.component';
import { TinyPageDirective } from '../../ui/tiny-page.directive';
import { RAIL_EDGE } from '../../strip/strip';
import { ICONS } from '../../ui/icons';

/** A mouse drag longer than this is a pan, not a click. */
const CLICK_SLOP = 5;

/** One turn: the strip slides one page over. The outgoing page obscures within HIDE_MS (CSS, .slot-nb .veil);
 *  the incoming page stays hidden until SHARPEN_FROM of the turn, then sharpens. */
export const TURN_MS = 320;
const TURN_EASE = 'cubic-bezier(.2,.8,.2,1)';
const HIDE_MS = 80;
const SHARPEN_FROM = 0.55;
/** A page that arrives after its skeleton, or one let go past the snap mark, sharpens over this long. */
const SHARPEN_MS = 144;
const REDUCED_FADE_MS = 120;
const SPRING_MS = 280;
/** A neighbour's hover hint is complete (chevron, page, "Page only") with this much of it on screen, a chevron
 *  alone with HINT_MIN (zoomed in, when only a strip of it shows), and absent below. */
const HINT_FULL = 140;
const NARROW = 150;
const HINT_MIN = 40;

const pad2 = (n: number) => String(n).padStart(2, '0');

/** The page strip: the current page (the only sharp, interactive one) between its hidden neighbours. Owns the
 *  turn animation, desktop wheel zoom and drag-pan, neighbour clicks (page only, except the next-chapter teaser),
 *  and clicks on the page (lock or unlock the panels). Mobile input comes from the gesture layer above it. */
@Component({
  selector: 'app-reader',
  imports: [PageArtComponent, TinyPageDirective, LucideDynamicIcon],
  host: {
    class: 'fixed inset-0 block',
    'data-stage': '',
    '[style.cursor]': 'cursor()',
    '[style.--nb-alpha]': 'look.neighbourAlpha()',
    '(click)': 'onStageClick($event)',
    '(document:mousemove)': 'onMouseMove($event)',
    '(document:mousedown)': 'onMouseDown($event)',
    '(document:mouseup)': 'onMouseUp($event)',
    '(document:wheel)': 'onWheel($event)',
  },
  template: `
    @let mobile = layout.mobile();
    <div class="vt-page strip" [style.transform]="zoom.railOffset() ? 'translateX(' + zoom.railOffset() + 'px)' : null">
      <div #run class="strip-run" [class.turning]="turning()" [style.transform]="strip.dragX() ? 'translateX(' + strip.dragX() + 'px)' : null">
        @for (it of strip.items(); track it.key) {
          @let cur = it.k === 0;
          <div class="slot" [class.slot-cur]="cur" [class.slot-nb]="!cur"
            [class.armed]="it.key === strip.armedKey()" [attr.data-key]="it.key" [attr.aria-hidden]="cur ? null : 'true'"
            [style.transform]="cur ? null : 'translateX(' + it.x + 'px)'">
            <!-- The slot's frame: the current page zooms and pans inside it (it grows with the zoom, up to a cap that
                 keeps a strip of each neighbour on screen). -->
            <div class="slot-box" [style.left.px]="it.box.x" [style.top.px]="it.box.y" [style.width.px]="it.box.w" [style.height.px]="it.box.h">
              <div class="slot-zoom" [style.width.px]="it.rect.w" [style.height.px]="it.rect.h" [style.transform]="cur ? zoom.transform() : null">
                @if (it.url && (cur ? it.kind === 'page' : it.key === strip.ghostKey() || it.key === strip.armedKey())) {
                  <img class="slot-img" [src]="it.url" referrerpolicy="no-referrer" alt="" draggable="false" />
                }
                @if (it.image) { <div class="veil"><canvas [appTinyPage]="it.image"></canvas></div> }
              </div>
            </div>
            @if (it.kind !== 'page' || !it.image) {
              <div class="nb-box" [style.left.px]="it.rect.x" [style.top.px]="it.rect.y" [style.width.px]="it.rect.w" [style.height.px]="it.rect.h">
                @switch (it.kind) {
                  @case ('skeleton') {
                    @if (cur) {
                      <div class="a-shimmer absolute inset-0 overflow-hidden" animate.enter="a-fade-in">
                        <app-page-art kind="skeleton" class="size-full" />
                      </div>
                    } @else {
                      <div class="nb-skel absolute inset-0"></div>
                      @if (!mobile) {
                        <!-- Centred in the part of the slot that is on screen, and never wider than it. -->
                        @let vis = span(it);
                        @if (vis.width >= NARROW) {
                          <div class="pnl absolute top-[44%] -translate-x-1/2 gap-1.5 bg-ink px-4 py-3 shadow-none"
                            [style.left.px]="vis.from + vis.width / 2" [style.width.px]="Math.min(240, vis.width - 24)">
                            <span class="dsp text-xl">Page {{ pad2(it.page) }}</span>
                            <span class="lbl text-shu">Loading</span>
                          </div>
                        } @else if (vis.width >= 48) {
                          <span class="lbl absolute top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 text-shu" [style.left.px]="vis.from + vis.width / 2">Loading</span>
                        }
                      }
                    }
                  }
                  @case ('teaser') {
                    <!-- Sharp: it gives nothing away. Its text fits the part of the slot that is on screen. -->
                    @let vis = span(it);
                    <div class="nb-teaser absolute inset-0 border-[3px] border-paper bg-surface-1">
                      <div class="halftone h-[10.5%] border-b-[3px] border-paper bg-surface-2 [--grid:12px] [--dot:2.4px]"></div>
                      @if (vis.width >= NARROW) {
                        <div class="absolute flex flex-col items-start gap-5 px-6 pt-[8%]" [style.left.px]="vis.from" [style.width.px]="vis.width">
                          <span class="tag text-dim">End of chapter {{ it.chapter - 1 }}</span>
                          <span class="dsp" [style.font-size.px]="teaserSize(vis.width)">Chapter<br />{{ it.chapter }}</span>
                          <span class="btn btn-primary btn-lg pointer-events-none">Start<svg [lucideIcon]="icons.arrowRight" [size]="20" /></span>
                        </div>
                      } @else if (!mobile) {
                        <!-- Zoomed in, only a strip shows: a chevron and the chapter, like the hover hint. -->
                        <div class="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 text-paper"
                          [style.left.px]="vis.from + vis.width / 2">
                          <svg [lucideIcon]="icons.chevronsRight" [size]="32" />
                          <span class="dsp text-sm leading-tight text-center">Ch<br />{{ it.chapter }}</span>
                        </div>
                      }
                    </div>
                  }
                  @case ('empty') {
                    <div class="absolute inset-3 border-[3px] border-dashed border-line">
                      @if (!mobile) {
                        @let vis = span(it);
                        <span class="lbl absolute top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-normal text-center"
                          [style.left.px]="vis.from + vis.width / 2 - 12" [style.max-width.px]="Math.max(60, vis.width - 40)">
                          {{ emptyLabel(it) }}
                        </span>
                      }
                    </div>
                  }
                }
              </div>
            }
            @if (mobile && it.key === strip.dragTargetKey() && it.key !== strip.armedKey()) {
              <!-- On the side of the incoming page that is on screen. -->
              <span class="tag absolute z-[3] bg-ink text-paper" [style.top.px]="it.rect.y + 12"
                [style.left.px]="it.k > 0 ? it.rect.x + 12 : null"
                [style.right.px]="it.k < 0 ? layout.viewport().w - it.rect.x - it.rect.w + 12 : null">Page {{ pad2(it.page) }}</span>
            }
            @if (!mobile && !cur && !it.action && reading()) {
              <!-- Inert (an earlier chapter's page, an empty slot): a click here does nothing at all. -->
              <span class="nb-hit nb-inert" [style.left.px]="it.rect.x" [style.top.px]="it.rect.y" [style.width.px]="it.rect.w"
                [style.height.px]="it.rect.h" (click)="$event.stopPropagation()"></span>
            }
            @if (!mobile && !cur && it.action && reading()) {
              <button type="button" tabindex="-1" class="nb-hit" [class]="it.k < 0 ? 'cursor-w-resize' : 'cursor-e-resize'"
                [style.left.px]="it.rect.x" [style.top.px]="it.rect.y" [style.width.px]="it.rect.w" [style.height.px]="it.rect.h"
                [attr.aria-label]="label(it)" (click)="act(it, $event)">
                @if (it.kind !== 'teaser' && hint(it); as h) {
                  <span class="nb-hint" [style.left.px]="h.x">
                    <svg class="nb-arrow" [style.--nudge]="it.k < 0 ? '4px' : '-4px'"
                      [lucideIcon]="it.k < 0 ? icons.chevronLeft : icons.chevronRight" [size]="h.full ? 72 : 40" [strokeWidth]="1.5" />
                    @if (h.full) {
                      <span class="dsp text-lg">Page {{ pad2(it.page) }}</span>
                      <span class="tag bg-ink">Page only</span>
                    }
                  </span>
                }
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class ReaderComponent {
  protected reader = inject(ReaderService);
  protected zoom = inject(ZoomService);
  protected strip = inject(StripService);
  protected layout = inject(LayoutService);
  protected look = inject(AppearanceService);
  private ui = inject(UiService);
  private motion = inject(MotionService);
  private turn = inject(PageTurnService);
  protected readonly icons = ICONS;
  protected readonly pad2 = pad2;
  protected readonly Math = Math;
  /** Below this much on screen, a teaser or a loading card takes its narrow form. */
  protected readonly NARROW = NARROW;

  private readonly run = viewChild<ElementRef<HTMLElement>>('run');
  private drag: (DragStart & { moved: boolean }) | null = null;
  /** Where the mouse went down (desktop), to tell a click from a press that wandered off. */
  private press: { x: number; y: number; hit: Element | null } | null = null;
  private suppressClick = false;

  /** Animations of the turn in flight, finished at once by the next turn or drag. */
  private running: Animation[] = [];
  private timers: ReturnType<typeof setTimeout>[] = [];
  private incomingX = 0;
  /** A turn is sliding: no hover hints flash on as neighbours pass under a resting pointer. */
  protected readonly turning = signal(false);
  private swipe = { fromX: 0, revealed: false };

  protected readonly reading = computed(() => {
    const s = this.reader.screen();
    return s === 'image' || s === 'loading';
  });

  protected readonly cursor = computed(() => {
    if (!this.zoom.isZoomed()) return '';
    return this.zoom.isDragging() ? 'grabbing' : 'grab';
  });

  constructor() {
    // A drag that ends over the page must not also click it (lock the panels) or a neighbour (turn the page).
    const swallowClick = (e: MouseEvent) => {
      if (!this.suppressClick) return;
      this.suppressClick = false;
      e.stopPropagation();
      e.preventDefault();
    };
    document.addEventListener('click', swallowClick, true);
    const detach = this.turn.attach({
      before: d => this.before(d), after: d => this.after(d), settle: () => this.settle(), springBack: x => this.springBack(x),
    });
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('click', swallowClick, true);
      detach();
      this.settle();
    });
  }

  protected label(it: StripItem): string {
    if (it.action === 'nextChapter') return `Next chapter, ${it.chapter}`;
    return it.k < 0 ? 'Previous page (this chapter only)' : 'Next page (this chapter only)';
  }

  protected act(it: StripItem, e: Event) {
    e.stopPropagation();
    if (it.action === 'prevPage') this.reader.prevPage();
    else if (it.action === 'nextPage') this.reader.nextPage();
    else if (it.action === 'nextChapter') this.reader.nextChapter();
  }

  /** The part of a neighbour that is on screen (and not under the rail), from its left edge. */
  protected span(it: StripItem): { from: number; width: number } {
    const left = it.rect.x + it.x + this.zoom.railOffset();
    const clip = this.ui.showPanels() ? RAIL_EDGE : 0;
    const from = Math.max(left, clip), to = Math.min(left + it.rect.w, this.layout.viewport().w);
    return { from: from - left, width: Math.max(0, to - from) };
  }

  /** The hover hint sits in the middle of the neighbour's visible part, or nowhere when too little of it shows. */
  protected hint(it: StripItem): { x: number; full: boolean } | null {
    const s = this.span(it);
    return s.width >= HINT_MIN ? { x: s.from + s.width / 2, full: s.width >= HINT_FULL } : null;
  }

  protected emptyLabel(it: StripItem): string {
    if (it.k > 0) return `No chapter ${it.chapter} yet`;
    return it.chapter > 1 ? `Start of chapter ${it.chapter}` : 'No earlier page';
  }

  /** "CHAPTER" in the display face is about 6.4 em wide: fit it inside the teaser's visible part. */
  protected teaserSize(width: number): number {
    return Math.max(20, Math.min(50, (width - 56) / 6.6));
  }

  /** Desktop: a click on the page (or between pages) locks or unlocks the panels, like the old middle zone. */
  protected onStageClick(e: MouseEvent) {
    if (this.layout.mobile() || !this.reading() || (e.target as HTMLElement).closest('.nb-hit')) return;
    this.ui.togglePanels();
  }

  // ---- Turn animation (PageTurnService calls these around the state change) ----

  private get reduced() { return this.motion.motion() === 'reduced'; }

  private before(dir: StripTurn) {
    this.settle();
    this.swipe = this.strip.takeRelease();
    if (dir === 'arrive' || this.reduced) return;
    // The caption and counters keep showing the outgoing page until the incoming one starts to show (55%).
    if (this.swipe.fromX === 0) this.reader.captionHold.set(this.reader.shown());
    const side = dir === 'next' ? 1 : -1;
    const items = this.strip.items();
    const cur = items.find(i => i.k === 0), out = items.find(i => i.k === -side);
    this.incomingX = items.find(i => i.k === side)?.x ?? 0;
    // The outgoing page keeps its sharp image while it obscures; the far neighbour stays until the strip settles.
    if (cur?.kind === 'page') this.strip.ghostKey.set(cur.key);
    if (out) this.strip.leaving.set({ slot: out, side: -side as -1 | 1 });
  }

  private after(dir: StripTurn) {
    const run = this.run()?.nativeElement;
    if (!run || typeof run.animate !== 'function') { this.strip.ghostKey.set(null); this.strip.leaving.set(null); return; }
    const cur = this.slotEl(run, this.strip.items().find(i => i.k === 0)?.key);
    const img = cur?.querySelector<HTMLElement>('.slot-img');
    if (this.reduced) {
      if (img) this.track(img.animate([{ opacity: 0 }, { opacity: 1 }], { duration: REDUCED_FADE_MS, easing: 'ease-out' }));
      return;
    }
    if (dir === 'arrive') { this.sharpen(cur, 0, SHARPEN_MS); return; }

    const swiped = this.swipe.fromX !== 0;
    const from = this.incomingX + this.swipe.fromX;
    const duration = swiped
      ? Math.round(Math.max(160, TURN_MS * Math.abs(from) / Math.max(1, Math.abs(this.incomingX))))
      : TURN_MS;
    this.track(run.animate([{ transform: `translateX(${from}px)` }, { transform: 'translateX(0px)' }], { duration, easing: TURN_EASE }));
    // Let go past the snap mark it is already sharp; on a flick it sharpens at once; otherwise from 55%.
    if (!this.swipe.revealed) this.sharpen(cur, swiped ? 0 : SHARPEN_FROM, swiped ? SHARPEN_MS : TURN_MS);
    this.turning.set(true);
    this.timers.push(
      setTimeout(() => this.reader.captionHold.set(null), Math.round(TURN_MS * SHARPEN_FROM)),
      setTimeout(() => this.strip.ghostKey.set(null), HIDE_MS),
      setTimeout(() => { this.strip.leaving.set(null); this.turning.set(false); }, duration),
    );
  }

  /** The incoming page: exactly the hidden-neighbour drawing (tone only) until `hold` of the way, then it
   *  crossfades to the real page. The real page is never shown blurred: a blur of the full image keeps big shapes. */
  private sharpen(el: HTMLElement | null, hold: number, duration: number) {
    if (!el) return;
    const a = this.look.neighbourAlpha();
    const opts: KeyframeAnimationOptions = { duration, easing: 'linear' };
    const img = el.querySelector<HTMLElement>('.slot-img'), veil = el.querySelector<HTMLElement>('.veil');
    if (img) this.track(img.animate([{ opacity: 0, offset: 0 }, { opacity: 0, offset: hold }, { opacity: 1, offset: 1 }], opts));
    if (veil) this.track(veil.animate([{ opacity: a, offset: 0 }, { opacity: a, offset: hold }, { opacity: 0, offset: 1 }], opts));
  }

  private springBack(fromX: number) {
    const run = this.run()?.nativeElement;
    if (this.reduced || !run || typeof run.animate !== 'function') return;
    this.settle();
    this.track(run.animate([{ transform: `translateX(${fromX}px)` }, { transform: 'translateX(0px)' }],
      { duration: SPRING_MS, easing: 'cubic-bezier(.3,1.35,.5,1)' }));
  }

  /** Jumps a running turn to its end. */
  private settle() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    for (const a of this.running) { a.finish(); a.cancel(); }
    this.running = [];
    this.strip.ghostKey.set(null);
    this.strip.leaving.set(null);
    this.turning.set(false);
    this.reader.captionHold.set(null);
  }

  private track(a: Animation) {
    this.running.push(a);
    a.finished.then(() => { this.running = this.running.filter(r => r !== a); }, () => {});
  }

  private slotEl(run: HTMLElement, key: string | undefined): HTMLElement | null {
    return ([...run.children] as HTMLElement[]).find(c => c.dataset['key'] === key) ?? null;
  }

  // ---- Desktop mouse: wheel zoom toward the cursor, drag-pan while zoomed ----

  protected onMouseMove(e: MouseEvent) {
    this.zoom.mouseX.set(e.clientX);
    this.zoom.mouseY.set(e.clientY);
    if (!this.drag) return;
    if (Math.hypot(e.clientX - this.drag.startX, e.clientY - this.drag.startY) > CLICK_SLOP) this.drag.moved = true;
    this.zoom.doDrag(this.drag, e.clientX, e.clientY);
  }

  protected onMouseDown(e: MouseEvent) {
    if (this.layout.mobile() || e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (!target.closest('[data-stage]')) { this.press = null; return; }
    const hit = target.closest('.nb-hit');
    this.press = { x: e.clientX, y: e.clientY, hit };
    // A press on a neighbour is a click on it (a page turn), never the start of a pan.
    if (!this.zoom.isZoomed() || hit) return;
    this.drag = { ...this.zoom.startDrag(e.clientX, e.clientY), moved: false };
    e.preventDefault();
  }

  /** A click only counts where the press began and when the mouse stayed put: a pan, or a press on a neighbour
   *  that was let go elsewhere, neither turns the page nor locks the panels. */
  protected onMouseUp(e?: MouseEvent) {
    const p = this.press;
    this.press = null;
    const moved = !!this.drag?.moved || (!!p && !!e && Math.hypot(e.clientX - p.x, e.clientY - p.y) > CLICK_SLOP);
    const left = !!p?.hit && !!e && !(e.target as Element | null)?.closest?.('.nb-hit')?.isSameNode(p.hit);
    if (p && (moved || left)) {
      this.suppressClick = true;
      // The click (if any) fires right after mouseup; never let the flag outlive it.
      setTimeout(() => (this.suppressClick = false));
    }
    if (this.drag) { this.drag = null; this.zoom.endDrag(); }
  }

  protected onWheel(e: WheelEvent) {
    if (!this.reader.lastGood() || !(e.target as HTMLElement).closest('[data-stage]')) return;
    e.preventDefault();
    this.zoom.setZoom(this.zoom.zoom() + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP), e.clientX, e.clientY);
  }
}
