import { Injectable, signal } from '@angular/core';

export interface LibraryEntry {
  slug: string;
  chapters: Record<number, number>;
  chapterPages?: Record<number, number>;
  lastChapter?: number;
  lastPage?: number;
  updatedAt?: number;
  favourite?: boolean;
}

const STORAGE_KEY = 'manga-reader-library';

@Injectable({ providedIn: 'root' })
export class LibraryService {
  entries = signal<LibraryEntry[]>([]);

  constructor() { this.reload(); }

  private getAll(): Record<string, LibraryEntry> {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  }

  private persist(lib: Record<string, LibraryEntry>) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));
    this.reload();
  }

  reload() {
    const all = Object.values(this.getAll());
    all.sort((a, b) => {
      if (!!b.favourite !== !!a.favourite) return b.favourite ? 1 : -1;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
    this.entries.set(all);
  }

  saveProgress(manga: string, chapter: number, page: number) {
    const lib = this.getAll();
    if (!lib[manga]) lib[manga] = { slug: manga, chapters: {} };
    lib[manga].chapters = lib[manga].chapters || {};
    lib[manga].chapters[chapter] = page;
    lib[manga].lastChapter = chapter;
    lib[manga].lastPage = page;
    lib[manga].updatedAt = Date.now();
    this.persist(lib);
    localStorage.setItem('manga-reader-last', JSON.stringify({ slug: manga, chapter, page }));
  }

  saveChapterLength(manga: string, chapter: number, total: number) {
    const lib = this.getAll();
    if (!lib[manga]) return;
    lib[manga].chapterPages = lib[manga].chapterPages || {};
    lib[manga].chapterPages![chapter] = total;
    this.persist(lib);
  }

  savedChapterPage(manga: string, chapter: number): number {
    return this.getAll()[manga]?.chapters?.[chapter] ?? 1;
  }

  remove(manga: string) {
    const lib = this.getAll();
    delete lib[manga];
    this.persist(lib);
  }

  toggleFavourite(manga: string) {
    const lib = this.getAll();
    if (!lib[manga]) return;
    lib[manga].favourite = !lib[manga].favourite;
    this.persist(lib);
  }

  formatName(slug: string): string {
    return slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  getLast(): { slug: string; chapter: number; page: number } | null {
    try { return JSON.parse(localStorage.getItem('manga-reader-last') || 'null'); } catch { return null; }
  }
}
