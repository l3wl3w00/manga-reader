import { Injectable, computed, inject, signal } from '@angular/core';
import { ReaderService } from './reader.service';
import { LibraryService } from './library.service';
import { PreloadService } from './preload.service';
import { SourceService } from './source.service';
import { LayoutService } from './layout.service';
import { ZoomService } from './zoom.service';
import { PageTurnService } from './page-turn.service';
import { Rect, Size, TYPICAL_PAGE, containRect } from './zoom-math';
import { STRIP_GAP, Slot, StripPlace, currentSlot, nextSlot, prevSlot, slotDistance, turnsPage } from '../strip/strip';
import { dragOffset, isArmed, swipeSnap } from '../gestures/gestures';

/** Mid-swipe, the incoming page is tagged (and the cue shown) once the drag is clearly a swipe. */
export const SHOW_CUE_FROM = 16;

/** A slot placed on screen. k: -1 previous, 0 current, 1 next; ±2 a page leaving during a turn.
 *  x: offset of its centre from the current page's centre. rect: where its page sits at 100%. box: the slot's
 *  frame: the page itself for a neighbour; for the current page the frame it zooms and pans in, which grows with
 *  the zoom (the neighbours move out with it, staying one gap away). */
export interface StripItem extends Slot {
  k: number;
  x: number;
  rect: Rect;
  box: Rect;
  image: HTMLImageElement | null;
}

/** The page strip: the page on screen with its hidden neighbours, where they sit, and the swipe that drags
 *  them (mobile). The reader draws it and runs its animations. */
@Injectable({ providedIn: 'root' })
export class StripService {
  private reader = inject(ReaderService);
  private lib = inject(LibraryService);
  private preload = inject(PreloadService);
  private source = inject(SourceService);
  private layout = inject(LayoutService);
  private zoom = inject(ZoomService);
  private turn = inject(PageTurnService);

  /** During a turn: the outgoing page keeps its sharp image this long (it hides over ~80 ms). */
  readonly ghostKey = signal<string | null>(null);
  /** During a turn: the neighbour pushed off the far side, kept until the strip settles. */
  readonly leaving = signal<{ slot: Slot; side: -1 | 1 } | null>(null);

  /** Mobile swipe: how far the strip follows the finger, in px. */
  readonly dragX = signal(0);
  readonly dragging = signal(false);
  private released: { fromX: number; revealed: boolean } | null = null;

  /** What is on screen: the page that loaded last, or the page loading in its place. */
  private readonly place = computed<(StripPlace & { loading: boolean }) | null>(() => {
    const r = this.reader;
    const screen = r.screen();
    const spot = screen === 'loading'
      ? { manga: r.manga(), chapter: r.chapter(), page: r.page() }
      : screen === 'image' || screen === 'end' ? r.lastGood() : null;
    if (!spot) return null;
    // The page on screen keeps the address it loaded from, also after the page template changes: a new template
    // applies from the next turn (the neighbours already use it).
    const g = r.lastGood(), shownUrl = r.imgSrc(), loading = screen === 'loading';
    return {
      ...spot,
      loading,
      url: (manga, chapter, page) => !loading && shownUrl && g && g.manga === manga && g.chapter === chapter && g.page === page
        ? shownUrl : this.source.pageUrl(manga, chapter, page),
      total: this.lengthOf(spot.manga, spot.chapter),
      prevTotal: spot.chapter > 1 ? this.lengthOf(spot.manga, spot.chapter - 1) : null,
      ready: url => this.preload.ready(url),
      missing: url => this.preload.missing(url),
    };
  });

  readonly prev = computed(() => { const p = this.place(); return p ? prevSlot(p) : null; });
  readonly next = computed(() => { const p = this.place(); return p ? nextSlot(p) : null; });

  readonly items = computed<StripItem[]>(() => {
    const p = this.place();
    if (!p) return [];
    const vp = this.layout.viewport(), inset = this.zoom.inset();
    const gap = this.layout.mobile() ? STRIP_GAP.mobile : STRIP_GAP.desktop;
    const curSize = this.zoom.imageSize() ?? TYPICAL_PAGE;
    const place = (slot: Slot, k: number, x: number): StripItem => {
      const image = slot.url ? this.preload.get(slot.url) : null;
      const size: Size = image?.naturalWidth ? { w: image.naturalWidth, h: image.naturalHeight } : curSize;
      const rect = containRect(vp, size, inset);
      return { ...slot, k, x, rect, box: rect, image };
    };
    const cur = place(currentSlot(p, p.loading), 0, 0);
    if (!p.loading) cur.box = this.zoom.frame();
    const prev = place(this.prev()!, -1, 0), next = place(this.next()!, 1, 0);
    prev.x = -slotDistance(cur.box.w, prev.rect.w, gap);
    next.x = slotDistance(cur.box.w, next.rect.w, gap);
    const items = [prev, cur, next];
    const out = this.leaving();
    if (out && !items.some(i => i.key === out.slot.key)) {
      const near = out.side < 0 ? prev : next;
      const item = place(out.slot, 2 * out.side, 0);
      item.x = near.x + out.side * slotDistance(near.rect.w, item.rect.w, gap);
      items.unshift(item);
    }
    return items;
  });

  /** The neighbour a drag of dx is heading to, and how far away it is. */
  private target(dx: number) {
    const item = this.items().find(i => i.k === (dx < 0 ? 1 : -1));
    return { slot: item ?? null, step: item ? Math.abs(item.x) : 0 };
  }

  /** Past the snap mark toward a page that can be turned to: it sharpens before the finger lets go. */
  readonly armedKey = computed(() => {
    const dx = this.dragX();
    if (!this.dragging() || !dx) return null;
    const { slot, step } = this.target(dx);
    return slot && turnsPage(slot) && slot.kind === 'page' && isArmed(dx, step) ? slot.key : null;
  });

  /** Mid-swipe: the page that would come in, once the drag is clearly a swipe toward one. */
  readonly dragTargetKey = computed(() => {
    const dx = this.dragX();
    if (!this.dragging() || Math.abs(dx) < SHOW_CUE_FROM) return null;
    const { slot } = this.target(dx);
    return slot && turnsPage(slot) ? slot.key : null;
  });

  drag(dx: number) {
    if (!this.dragging()) { this.turn.animator?.settle(); this.dragging.set(true); }
    const { step } = this.target(dx);
    const prev = this.prev(), next = this.next();
    this.dragX.set(dragOffset(dx, step, !!prev && turnsPage(prev), !!next && turnsPage(next)));
  }

  /** The finger let go after dragging dx at vx px/ms: turn the page, or spring back. Swipes are page only:
   *  past the chapter's last page they bring up the end-of-chapter card instead. */
  release(dx: number, vx: number) {
    const revealed = this.armedKey() !== null;
    const { slot, step } = this.target(dx);
    const snap = swipeSnap(dx, vx, step);
    this.dragging.set(false);
    if (slot && snap !== 'back' && turnsPage(slot)) {
      this.released = { fromX: this.dragX(), revealed };
      if (snap === 'next' ? this.reader.nextPage() : this.reader.prevPage()) return;
      this.released = null;
    }
    this.springBack();
    if (snap === 'next' && slot?.kind === 'teaser') this.reader.nextPage();
  }

  cancel() {
    if (!this.dragging()) return;
    this.dragging.set(false);
    this.springBack();
  }

  /** For the animator: where a swipe let go, as the turn starts from there. */
  takeRelease(): { fromX: number; revealed: boolean } {
    const r = this.released ?? { fromX: this.dragX(), revealed: false };
    this.released = null;
    this.dragX.set(0);
    return r;
  }

  private springBack() {
    const x = this.dragX();
    if (x) this.turn.animator?.springBack(x);
    this.dragX.set(0);
  }

  private lengthOf(manga: string, ch: number): number | null {
    const r = this.reader;
    if (manga === r.manga() && ch === r.chapter() && r.totalPages()) return r.totalPages();
    return this.lib.entries().find(e => e.slug === manga)?.chapterPages?.[ch] ?? null;
  }
}
