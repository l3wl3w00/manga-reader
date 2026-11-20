import { Injectable, signal, computed, inject } from '@angular/core';
import { LibraryService } from './library.service';
import { ZoomService } from './zoom.service';
import { PageTurnService, TurnDirection } from './page-turn.service';
import { PreloadService } from './preload.service';
import { buildUrl } from './source';
import { preloadTargets } from '../strip/strip';

export { buildUrl } from './source';

/** welcome: nothing loaded. loading: a page is slow to arrive. end: walked past the chapter's last page.
 *  not-found: the manga, chapter or first page does not exist. */
export type Screen = 'welcome' | 'loading' | 'image' | 'end' | 'not-found';

export interface Spot { manga: string; chapter: number; page: number; }

export type MissKind = 'end' | 'not-found';

/** Loading only shows after this long, so quick page turns never flash a skeleton. */
export const SLOW_LOAD_MS = 180;

/** A 404 right after a page of the same chapter (or past its known length) is the end of the
 *  chapter. A 404 on page 1, or anywhere we have not been reading, means the address is wrong. */
export function classifyMiss(miss: Spot, lastGood: Spot | null, knownLength: number | null = null): MissKind {
  if (miss.page <= 1) return 'not-found';
  const sameChapter = !!lastGood && lastGood.manga === miss.manga && lastGood.chapter === miss.chapter;
  if (!sameChapter) return 'not-found';
  if (knownLength && miss.page > knownLength) return 'end';
  return miss.page === lastGood!.page + 1 ? 'end' : 'not-found';
}

interface LoadOptions {
  /** Called instead of showing a miss (buttons and keys use it to roll into the next chapter). */
  onFail?: (() => void) | null;
  dir?: TurnDirection;
}

@Injectable({ providedIn: 'root' })
export class ReaderService {
  private lib = inject(LibraryService);
  private zoom = inject(ZoomService);
  private turn = inject(PageTurnService);
  private preload = inject(PreloadService);

  readonly manga      = signal('');
  readonly chapter    = signal(1);
  readonly page       = signal(1);
  readonly totalPages = signal<number | null>(null);
  readonly busy       = signal(false);
  readonly screen     = signal<Screen>('welcome');
  readonly imgSrc     = signal('');
  /** The last page that actually loaded. */
  readonly lastGood   = signal<Spot | null>(null);
  /** The address that 404'd, while on the end or not-found screen. */
  readonly missed     = signal<Spot | null>(null);


  /** During a strip turn, the outgoing page until the incoming one starts to show (the reader sets and clears it). */
  readonly captionHold = signal<{ chapter: number; page: number } | null>(null);

  /** The place on screen: the incoming page while its skeleton shows, otherwise the last page that loaded.
   *  Captions and counters read this, so they change together with the image, not before it. */
  readonly shown = computed(() => {
    const hold = this.captionHold();
    if (hold) return hold;
    const g = this.lastGood();
    return this.screen() === 'loading' || !g || g.manga !== this.manga()
      ? { chapter: this.chapter(), page: this.page() }
      : { chapter: g.chapter, page: g.page };
  });
  /** Length of the chapter on screen: during a turn into another chapter the counters keep the old chapter's
   *  length until its page leaves, so they change together with the page. */
  readonly shownTotal = computed(() => {
    const ch = this.shown().chapter;
    return ch === this.chapter() ? this.totalPages() : this.lengthOf(this.manga(), ch);
  });
  /** How far through the chapter the page on screen is, in %. */
  readonly progress = computed(() => {
    const tp = this.shownTotal();
    return tp ? Math.min(100, (this.shown().page / tp) * 100) : 0;
  });
  readonly atLastPage = computed(() => {
    const tp = this.totalPages();
    return !!tp && this.page() >= tp;
  });

  private slowTimer: ReturnType<typeof setTimeout> | undefined;

  /** Starts loading a page. Returns false when nothing happens (busy, or no manga). A page fetched ahead shows
   *  at once; a strip turn onto one still loading slides its skeleton in now and sharpens it when it arrives. */
  load(manga: string, ch: number, pg: number, opts: LoadOptions = {}): boolean {
    if (this.busy()) return false;
    if (!manga) { this.screen.set('welcome'); return false; }
    const dir = opts.dir ?? 'jump';
    const newManga = manga !== this.lastGood()?.manga;
    const spot: Spot = { manga, chapter: ch, page: pg };
    this.manga.set(manga); this.chapter.set(ch); this.page.set(pg);
    this.totalPages.set(this.lib.chapterLength(manga, ch));
    clearTimeout(this.slowTimer);

    const url = buildUrl(manga, ch, pg);
    const ready = this.preload.get(url);
    if (ready) { this.show(spot, url, ready, dir, newManga); return true; }

    this.busy.set(true);
    const slide = !newManga && (dir === 'next' || dir === 'prev');
    if (slide) this.turn.run(dir, () => this.screen.set('loading'));
    else this.slowTimer = setTimeout(() => { if (this.busy()) this.screen.set('loading'); }, SLOW_LOAD_MS);

    const probe = new Image();
    probe.referrerPolicy = 'no-referrer';
    probe.onload = async () => {
      // Decode first, so the turn shows a painted page, not a blank one.
      try { await probe.decode?.(); } catch { /* still shows */ }
      this.settle();
      this.preload.add(url, probe);
      this.show(spot, url, probe, slide ? 'arrive' : dir, newManga);
    };
    probe.onerror = () => {
      this.settle();
      if (opts.onFail) { opts.onFail(); return; }
      this.showMiss(spot);
    };
    probe.src = url;
    return true;
  }

  private show(spot: Spot, url: string, img: HTMLImageElement, dir: TurnDirection, newManga: boolean) {
    this.turn.run(dir, () => {
      this.imgSrc.set(url);
      this.screen.set('image');
      this.missed.set(null);
      this.lastGood.set(spot);
      this.zoom.imageSize.set({ w: img.naturalWidth, h: img.naturalHeight });
      if (this.zoom.autoFit()) this.zoom.autoFitZoom(img.naturalWidth, img.naturalHeight);
      else if (newManga) this.zoom.resetZoom();
    });
    this.lib.saveProgress(spot.manga, spot.chapter, spot.page);
    this.preloadAround(spot);
  }

  private settle() {
    clearTimeout(this.slowTimer);
    this.busy.set(false);
  }

  private showMiss(spot: Spot) {
    const known = this.lib.chapterLength(spot.manga, spot.chapter);
    const last = this.lastGood();
    this.missed.set(spot);
    if (classifyMiss(spot, last, known) === 'end' && last) {
      const lastPage = known && known < spot.page ? known : spot.page - 1;
      this.page.set(last.page);
      this.totalPages.set(lastPage);
      this.lib.saveChapterLength(spot.manga, spot.chapter, lastPage);
      this.screen.set(this.imgSrc() ? 'end' : 'not-found');
    } else {
      this.screen.set('not-found');
    }
  }

  /** Fetches the strip's neighbours ahead, so turns are instant. */
  private preloadAround(spot: Spot) {
    const { manga, chapter, page } = spot;
    const total = this.totalPages();
    const place = { manga, chapter, page, total, prevTotal: chapter > 1 ? this.lib.chapterLength(manga, chapter - 1) : null };
    const [ahead, ...rest] = preloadTargets(place);
    if (ahead === buildUrl(manga, chapter, page + 1)) this.probeNext(manga, chapter, page);
    else this.preload.load(ahead);
    rest.forEach(url => this.preload.load(url));
  }

  /** Loads the next page ahead; a 404 there means this page is the chapter's last. */
  private probeNext(manga: string, ch: number, pg: number) {
    this.preload.load(buildUrl(manga, ch, pg + 1), () => {
      this.lib.saveChapterLength(manga, ch, pg);
      if (this.manga() === manga && this.chapter() === ch) {
        this.totalPages.set(pg);
        // The end is known now: warm up the next chapter for the keys and the bar.
        this.preload.load(buildUrl(manga, ch + 1, 1));
      }
    });
  }

  private lengthOf(manga: string, ch: number): number | null {
    return this.lib.entries().find(e => e.slug === manga)?.chapterPages?.[ch] ?? null;
  }

  /** Neighbour clicks and swipes: page only, never into another chapter. True when a turn started. */
  nextPage(): boolean {
    if (!this.manga() || this.busy()) return false;
    return this.load(this.manga(), this.chapter(), this.page() + 1, { onFail: null, dir: 'next' });
  }
  prevPage(): boolean {
    if (!this.manga() || this.busy() || this.page() <= 1) return false;
    return this.load(this.manga(), this.chapter(), this.page() - 1, { dir: 'prev' });
  }

  /** Buttons and keys: roll into the next chapter at the end. */
  nextPageFull() {
    if (!this.manga() || this.busy()) return;
    if (this.atLastPage()) this.load(this.manga(), this.chapter() + 1, 1, { dir: 'next' });
    else this.load(this.manga(), this.chapter(), this.page() + 1, {
      dir: 'next',
      onFail: () => this.load(this.manga(), this.chapter() + 1, 1, { dir: 'next' }),
    });
  }

  prevPageFull() {
    if (!this.manga() || this.busy()) return;
    if (this.page() <= 1) {
      if (this.chapter() > 1) this.load(this.manga(), this.chapter() - 1, this.lib.savedChapterPage(this.manga(), this.chapter() - 1), { dir: 'prev' });
    } else this.load(this.manga(), this.chapter(), this.page() - 1, { dir: 'prev' });
  }

  nextChapter() { if (this.manga()) this.load(this.manga(), this.chapter() + 1, 1, { dir: 'next' }); }

  prevChapter() {
    if (!this.manga() || this.chapter() <= 1) return;
    this.load(this.manga(), this.chapter() - 1, this.lib.savedChapterPage(this.manga(), this.chapter() - 1), { dir: 'prev' });
  }

  goToPage(pg: number) {
    if (!this.manga() || pg < 1 || pg === this.page()) return;
    this.load(this.manga(), this.chapter(), pg, { dir: pg > this.page() ? 'next' : 'prev' });
  }

  /** End of chapter: back to its last page. */
  backFromEnd() {
    const last = this.totalPages();
    if (!last || this.page() === last) { this.screen.set('image'); this.missed.set(null); return; }
    this.load(this.manga(), this.chapter(), last, { dir: 'prev' });
  }

  retry() {
    const m = this.missed();
    if (m) this.load(m.manga, m.chapter, m.page);
  }

  backToLastGood() {
    const g = this.lastGood();
    if (g) this.load(g.manga, g.chapter, g.page);
  }
}
