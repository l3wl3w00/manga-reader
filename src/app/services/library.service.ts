import { Injectable, computed, signal } from '@angular/core';

export interface LibraryEntry {
  slug: string;
  chapters: Record<number, number>;
  chapterPages?: Record<number, number>;
  lastChapter?: number;
  lastPage?: number;
  /** ms since epoch of the last page read. Entries saved by very old versions have none. */
  updatedAt?: number;
  favourite?: boolean;
}

/** A row of the library list: a section header or an entry. */
export type LibraryItem =
  | { section: 'Favourites' | 'Recent'; entry?: undefined }
  | { section?: undefined; entry: LibraryEntry };

export interface LastRead { slug: string; chapter: number; page: number; }

const STORAGE_KEY = 'manga-reader-library';
const LAST_KEY = 'manga-reader-last';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "Just now", "12 min ago", "3 h ago", "Yesterday", "5 days ago", "Last week", "3 weeks ago"... '' when unknown. */
export function relativeTime(ts: number | undefined, now: number): string {
  if (!ts || !Number.isFinite(ts)) return '';
  const diff = Math.max(0, now - ts);
  if (diff < MINUTE) return 'Just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} h ago`;
  const days = Math.floor(diff / DAY);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'Last week';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return 'Last month';
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return days < 730 ? 'Last year' : `${Math.floor(days / 365)} years ago`;
}

/** Makes an entry from any stored shape safe to read; older versions may lack fields. */
export function normalizeEntry(key: string, raw: unknown): LibraryEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Partial<LibraryEntry>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined);
  const chapters = e.chapters && typeof e.chapters === 'object' ? e.chapters : {};
  return {
    ...e,
    slug: typeof e.slug === 'string' && e.slug ? e.slug : key,
    chapters,
    chapterPages: e.chapterPages && typeof e.chapterPages === 'object' ? e.chapterPages : undefined,
    lastChapter: num(e.lastChapter),
    lastPage: num(e.lastPage),
    updatedAt: num(e.updatedAt),
    favourite: !!e.favourite,
  };
}

export function sortEntries(entries: LibraryEntry[]): LibraryEntry[] {
  return [...entries].sort((a, b) => {
    if (!!b.favourite !== !!a.favourite) return b.favourite ? 1 : -1;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });
}

@Injectable({ providedIn: 'root' })
export class LibraryService {
  readonly entries = signal<LibraryEntry[]>([]);
  readonly favourites = computed(() => this.entries().filter(e => e.favourite));
  readonly recent = computed(() => this.entries().filter(e => !e.favourite));
  /** Favourites, then Recent, each under its header (headers only for non-empty sections). */
  readonly listing = computed<LibraryItem[]>(() => {
    const fav = this.favourites(), recent = this.recent();
    return [
      ...(fav.length ? [{ section: 'Favourites' as const }] : []),
      ...fav.map(entry => ({ entry })),
      ...(recent.length ? [{ section: 'Recent' as const }] : []),
      ...recent.map(entry => ({ entry })),
    ];
  });
  /** Reference time for "last read" labels, refreshed whenever the library changes. */
  readonly now = signal(Date.now());

  constructor() { this.reload(); }

  private getAll(): Record<string, LibraryEntry> {
    let raw: Record<string, unknown>;
    try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') ?? {}; } catch { return {}; }
    const out: Record<string, LibraryEntry> = {};
    for (const [key, value] of Object.entries(raw)) {
      const entry = normalizeEntry(key, value);
      if (entry) out[key] = entry;
    }
    return out;
  }

  private persist(lib: Record<string, LibraryEntry>) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));
    this.reload();
  }

  reload() {
    this.now.set(Date.now());
    this.entries.set(sortEntries(Object.values(this.getAll())));
  }

  saveProgress(manga: string, chapter: number, page: number) {
    const lib = this.getAll();
    const entry = lib[manga] ?? { slug: manga, chapters: {} };
    entry.chapters[chapter] = page;
    entry.lastChapter = chapter;
    entry.lastPage = page;
    entry.updatedAt = Date.now();
    lib[manga] = entry;
    this.persist(lib);
    localStorage.setItem(LAST_KEY, JSON.stringify({ slug: manga, chapter, page }));
  }

  saveChapterLength(manga: string, chapter: number, total: number) {
    const lib = this.getAll();
    const entry = lib[manga];
    if (!entry || entry.chapterPages?.[chapter] === total) return;
    entry.chapterPages = { ...entry.chapterPages, [chapter]: total };
    this.persist(lib);
  }

  chapterLength(manga: string, chapter: number): number | null {
    return this.getAll()[manga]?.chapterPages?.[chapter] ?? null;
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

  initials(slug: string): string {
    return this.formatName(slug).split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('');
  }

  /** Total pages of the entry's last chapter, if seen. */
  lastChapterLength(entry: LibraryEntry): number | null {
    return entry.lastChapter ? entry.chapterPages?.[entry.lastChapter] ?? null : null;
  }

  getLast(): LastRead | null {
    try { return JSON.parse(localStorage.getItem(LAST_KEY) || 'null'); } catch { return null; }
  }
}
