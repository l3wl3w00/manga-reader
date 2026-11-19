import { TestBed } from '@angular/core/testing';
import { LibraryService, normalizeEntry, relativeTime } from './library.service';

const NOW = Date.UTC(2026, 10, 19, 12);
const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;

describe('relativeTime', () => {
  it.each([
    [30_000, 'Just now'],
    [12 * MIN, '12 min ago'],
    [3 * HOUR, '3 h ago'],
    [DAY + HOUR, 'Yesterday'],
    [2 * DAY, '2 days ago'],
    [5 * DAY, '5 days ago'],
    [8 * DAY, 'Last week'],
    [22 * DAY, '3 weeks ago'],
    [40 * DAY, 'Last month'],
    [100 * DAY, '3 months ago'],
    [400 * DAY, 'Last year'],
    [800 * DAY, '2 years ago'],
  ])('%i ms ago reads "%s"', (ago, text) => {
    expect(relativeTime(NOW - ago, NOW)).toBe(text);
  });

  it('says nothing for entries saved without a timestamp', () => {
    expect(relativeTime(undefined, NOW)).toBe('');
  });

  it('never goes negative when the clock moved back', () => {
    expect(relativeTime(NOW + 5 * MIN, NOW)).toBe('Just now');
  });
});

describe('normalizeEntry', () => {
  it('fills what old entries lack and keeps what they have', () => {
    expect(normalizeEntry('iron_orchard', { chapters: { 3: 1 }, lastChapter: 3, lastPage: 1 })).toEqual({
      slug: 'iron_orchard', chapters: { 3: 1 }, chapterPages: undefined,
      lastChapter: 3, lastPage: 1, updatedAt: undefined, favourite: false,
    });
  });

  it('survives junk', () => {
    expect(normalizeEntry('x', null)).toBeNull();
    expect(normalizeEntry('x', { chapters: 'nope', lastPage: -1, updatedAt: 'soon' })).toMatchObject({ slug: 'x', chapters: {}, lastPage: undefined, updatedAt: undefined });
  });
});

describe('LibraryService with a library saved by an older version', () => {
  const OLD = {
    old_one: { slug: 'old_one', chapters: { 5: 9 }, lastChapter: 5, lastPage: 9 },
    starred: { slug: 'starred', chapters: { 1: 2 }, lastChapter: 1, lastPage: 2, updatedAt: NOW - DAY, favourite: true },
    newer: { slug: 'newer', chapters: { 2: 3 }, lastChapter: 2, lastPage: 3, updatedAt: NOW - HOUR },
  };
  let lib: LibraryService;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('manga-reader-library', JSON.stringify(OLD));
    TestBed.configureTestingModule({});
    lib = TestBed.inject(LibraryService);
  });

  it('loads every entry, favourites first, then most recent, undated last', () => {
    expect(lib.entries().map(e => e.slug)).toEqual(['starred', 'newer', 'old_one']);
  });

  it('splits Favourites and Recent under their headers', () => {
    expect(lib.listing().map(i => i.section ?? i.entry.slug)).toEqual(['Favourites', 'starred', 'Recent', 'newer', 'old_one']);
  });

  it('stamps the time on the next read and keeps the stored format', () => {
    lib.saveProgress('old_one', 5, 10);
    const saved = JSON.parse(localStorage.getItem('manga-reader-library')!).old_one;
    expect(saved).toMatchObject({ slug: 'old_one', chapters: { 5: 10 }, lastChapter: 5, lastPage: 10 });
    expect(saved.updatedAt).toBeGreaterThan(0);
    expect(JSON.parse(localStorage.getItem('manga-reader-last')!)).toEqual({ slug: 'old_one', chapter: 5, page: 10 });
  });

  it('starts with an empty shelf when the stored library is corrupt', () => {
    localStorage.setItem('manga-reader-library', '{not json');
    lib.reload();
    expect(lib.entries()).toEqual([]);
  });
});
