import { Injectable, signal, computed } from '@angular/core';
import { LibraryService } from './library.service';
import { ZoomService } from './zoom.service';

export type Screen = 'welcome' | 'loading' | 'error' | 'image';

function buildUrl(manga: string, ch: number, pg: number) {
  return `https://images.mangafreak.me/mangas/${manga}/${manga}_${ch}/${manga}_${ch}_${pg}.jpg`;
}

@Injectable({ providedIn: 'root' })
export class ReaderService {
  manga      = signal('');
  chapter    = signal(1);
  page       = signal(1);
  totalPages = signal<number | null>(null);
  busy       = signal(false);
  screen     = signal<Screen>('welcome');
  imgSrc     = signal('');

  info = computed(() => {
    if (!this.manga()) return '';
    const tp = this.totalPages();
    return tp ? `${this.page()} / ${tp}` : `Page ${this.page()}`;
  });

  progress = computed(() => {
    const tp = this.totalPages();
    return tp ? (this.page() / tp) * 100 : 0;
  });

  constructor(private lib: LibraryService, private zoom: ZoomService) {}

  buildUrl(manga: string, ch: number, pg: number) { return buildUrl(manga, ch, pg); }

  load(manga: string, ch: number, pg: number, opts: { onFail?: (() => void) | null } = {}) {
    if (this.busy()) return;
    if (!manga) { this.screen.set('welcome'); return; }
    const newManga = manga !== this.manga();
    this.busy.set(true);
    this.manga.set(manga); this.chapter.set(ch); this.page.set(pg); this.totalPages.set(null);
    this.screen.set('loading');

    const probe = new Image();
    probe.referrerPolicy = 'no-referrer';
    probe.onload = () => {
      this.busy.set(false);
      this.imgSrc.set(buildUrl(manga, ch, pg));
      this.screen.set('image');
      if (this.zoom.autoFit()) this.zoom.autoFitZoom(probe.naturalWidth, probe.naturalHeight);
      else if (newManga) this.zoom.resetZoom();
      this.lib.saveProgress(manga, ch, pg);
      this.probeNext(manga, ch, pg);
    };
    probe.onerror = () => {
      this.busy.set(false);
      if (opts.onFail) opts.onFail();
      else this.screen.set('error');
    };
    probe.src = buildUrl(manga, ch, pg);
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

  nextPage()  { if (!this.manga() || this.busy()) return; this.load(this.manga(), this.chapter(), this.page() + 1, { onFail: null }); }
  prevPage()  { if (!this.manga() || this.busy()) return; if (this.page() > 1) this.load(this.manga(), this.chapter(), this.page() - 1); }

  nextPageFull() {
    if (!this.manga() || this.busy()) return;
    const tp = this.totalPages();
    if (tp && this.page() >= tp) this.load(this.manga(), this.chapter() + 1, 1);
    else this.load(this.manga(), this.chapter(), this.page() + 1, { onFail: () => this.load(this.manga(), this.chapter() + 1, 1) });
  }

  prevPageFull() {
    if (!this.manga() || this.busy()) return;
    if (this.page() <= 1) { if (this.chapter() > 1) this.load(this.manga(), this.chapter() - 1, this.lib.savedChapterPage(this.manga(), this.chapter() - 1)); }
    else this.load(this.manga(), this.chapter(), this.page() - 1);
  }

  nextChapter() { if (this.manga()) this.load(this.manga(), this.chapter() + 1, 1); }

  prevChapter() {
    if (!this.manga() || this.chapter() <= 1) return;
    this.load(this.manga(), this.chapter() - 1, this.lib.savedChapterPage(this.manga(), this.chapter() - 1));
  }
}
