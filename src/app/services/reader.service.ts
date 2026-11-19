import { Injectable, signal, computed, inject } from '@angular/core';
import { LibraryService } from './library.service';
import { ZoomService } from './zoom.service';
import { PageTurnService, TurnDirection } from './page-turn.service';

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

export function buildUrl(manga: string, ch: number, pg: number) {
  return `https://images.mangafreak.me/mangas/${manga}/${manga}_${ch}/${manga}_${ch}_${pg}.jpg`;
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


  /** The place on screen: the incoming page while its skeleton shows, otherwise the last page that loaded.
   *  Captions read this, so they change together with the image (inside the page-turn transition). */
  readonly shown = computed(() => {
    const g = this.lastGood();
    return this.screen() === 'loading' || !g || g.manga !== this.manga()
      ? { chapter: this.chapter(), page: this.page() }
      : { chapter: g.chapter, page: g.page };
  });
  /** How far through the chapter the page on screen is, in %. */
  readonly progress = computed(() => {
    const tp = this.totalPages();
    return tp ? Math.min(100, (this.shown().page / tp) * 100) : 0;
  });
  readonly atLastPage = computed(() => {
    const tp = this.totalPages();
    return !!tp && this.page() >= tp;
  });

  private slowTimer: ReturnType<typeof setTimeout> | undefined;

  load(manga: string, ch: number, pg: number, opts: LoadOptions = {}) {
    if (this.busy()) return;
    if (!manga) { this.screen.set('welcome'); return; }
    const newManga = manga !== this.lastGood()?.manga;
    this.busy.set(true);
    this.manga.set(manga); this.chapter.set(ch); this.page.set(pg);
    this.totalPages.set(this.lib.chapterLength(manga, ch));
    clearTimeout(this.slowTimer);
    this.slowTimer = setTimeout(() => { if (this.busy()) this.screen.set('loading'); }, SLOW_LOAD_MS);

    const url = buildUrl(manga, ch, pg);
    const probe = new Image();
    probe.referrerPolicy = 'no-referrer';
    probe.onload = async () => {
      // Decode first, so the view transition snapshots a painted page, not a blank one.
      try { await probe.decode?.(); } catch { /* still shows */ }
      this.settle();
      this.turn.run(opts.dir ?? 'jump', () => {
        this.imgSrc.set(url);
        this.screen.set('image');
        this.missed.set(null);
        this.lastGood.set({ manga, chapter: ch, page: pg });
        this.zoom.imageSize.set({ w: probe.naturalWidth, h: probe.naturalHeight });
        if (this.zoom.autoFit()) this.zoom.autoFitZoom(probe.naturalWidth, probe.naturalHeight);
        else if (newManga) this.zoom.resetZoom();
      });
      this.lib.saveProgress(manga, ch, pg);
      this.probeNext(manga, ch, pg);
    };
    probe.onerror = () => {
      this.settle();
      if (opts.onFail) { opts.onFail(); return; }
      this.showMiss({ manga, chapter: ch, page: pg });
    };
    probe.src = url;
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

  private probeNext(manga: string, ch: number, pg: number) {
    const t = new Image();
    t.referrerPolicy = 'no-referrer';
    t.onerror = () => {
      if (this.manga() === manga && this.chapter() === ch && this.page() === pg) {
        this.totalPages.set(pg);
        this.lib.saveChapterLength(manga, ch, pg);
      }
    };
    t.src = buildUrl(manga, ch, pg + 1);
  }

  /** Click zones, taps and swipes: page only, never into another chapter. */
  nextPage() {
    if (!this.manga() || this.busy()) return;
    this.load(this.manga(), this.chapter(), this.page() + 1, { onFail: null, dir: 'next' });
  }
  prevPage() {
    if (!this.manga() || this.busy()) return;
    if (this.page() > 1) this.load(this.manga(), this.chapter(), this.page() - 1, { dir: 'prev' });
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
