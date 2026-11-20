import { TestBed } from '@angular/core/testing';
import { ReaderService, Spot, buildUrl, classifyMiss } from './reader.service';
import { PreloadService } from './preload.service';
import { LibraryService } from './library.service';

const spot = (page: number, chapter = 214, manga = 'crimson_tide_ronin'): Spot => ({ manga, chapter, page });

describe('classifyMiss', () => {
  it('calls a 404 on page 1 not found, even right after reading', () => {
    expect(classifyMiss(spot(1), null)).toBe('not-found');
    expect(classifyMiss(spot(1, 215), spot(19))).toBe('not-found');
  });

  it('calls the page after the last one read the end of the chapter', () => {
    expect(classifyMiss(spot(20), spot(19))).toBe('end');
  });

  it('calls any page past a known chapter length the end of the chapter', () => {
    expect(classifyMiss(spot(50), spot(4), 19)).toBe('end');
  });

  it('calls a jump to a far page that 404s not found when the length is unknown', () => {
    expect(classifyMiss(spot(50), spot(4))).toBe('not-found');
  });

  it('calls a miss in a chapter or manga we were not reading not found', () => {
    expect(classifyMiss(spot(20, 213), spot(19))).toBe('not-found');
    expect(classifyMiss(spot(20, 214, 'other'), spot(19), 19)).toBe('not-found');
  });
});

/** Stands in for the image host: pages exist up to each chapter's length. */
const CHAPTERS: Record<number, number> = { 213: 22, 214: 19, 215: 20 };
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  referrerPolicy = '';
  naturalWidth = 700;
  naturalHeight = 1000;
  set src(url: string) {
    const m = url.match(/_(\d+)_(\d+)\.jpg$/)!;
    const ok = url.includes('/crimson_tide_ronin/') && +m[2] <= (CHAPTERS[+m[1]] ?? 0);
    setTimeout(() => (ok ? this.onload?.() : this.onerror?.()));
  }
  decode() { return Promise.resolve(); }
}

const settle = async () => { for (let i = 0; i < 5; i++) await new Promise(r => setTimeout(r)); };

describe('ReaderService misses', () => {
  let reader: ReaderService;

  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('Image', FakeImage);
    TestBed.configureTestingModule({});
    reader = TestBed.inject(ReaderService);
  });
  afterEach(() => vi.unstubAllGlobals());

  async function open(page: number, chapter = 214) {
    reader.load('crimson_tide_ronin', chapter, page);
    await settle();
  }

  it('shows the end of chapter, not a 404, when a page-only turn walks past the last page', async () => {
    await open(19);
    reader.nextPage();
    await settle();
    expect(reader.screen()).toBe('end');
    expect(reader.missed()).toEqual(spot(20));
    expect(reader.page()).toBe(19);
    expect(reader.totalPages()).toBe(19);
  });

  it('keeps page-only turns (neighbour clicks, swipes) inside the chapter', async () => {
    await open(19);
    reader.nextPage();
    await settle();
    expect(reader.chapter()).toBe(214);
  });

  it('lets buttons and keys roll into the next chapter', async () => {
    await open(19);
    reader.nextPageFull();
    await settle();
    expect(reader.screen()).toBe('image');
    expect([reader.chapter(), reader.page()]).toEqual([215, 1]);
  });

  it('shows not found for a chapter that does not exist', async () => {
    await open(1, 999);
    expect(reader.screen()).toBe('not-found');
    expect(reader.missed()).toEqual(spot(1, 999));
  });

  it('shows not found for a misspelt manga', async () => {
    reader.load('crimson_tide_ronnin', 214, 1);
    await settle();
    expect(reader.screen()).toBe('not-found');
    expect(reader.lastGood()).toBeNull();
  });

  it('turns at once onto a page fetched ahead, and fetches the next neighbours', async () => {
    await open(7);
    expect(reader.nextPage()).toBe(true);
    expect(reader.lastGood()).toEqual(spot(8));
    expect(reader.busy()).toBe(false);
    await settle();
    const preload = TestBed.inject(PreloadService);
    expect(preload.ready(buildUrl('crimson_tide_ronin', 214, 9))).toBe(true);
    expect(preload.ready(buildUrl('crimson_tide_ronin', 214, 7))).toBe(true);
  });

  it("keeps the counters on the old chapter's length until its page leaves", async () => {
    await open(18);
    reader.nextPage();
    await settle();
    TestBed.inject(LibraryService).saveChapterLength('crimson_tide_ronin', 213, 22);
    reader.load('crimson_tide_ronin', 213, 5);
    // Page 5 of 213 is still on its way: the page on screen is 214's, and so is the count.
    expect(reader.busy()).toBe(true);
    expect(reader.totalPages()).toBe(22);
    expect(reader.shownTotal()).toBe(19);
    await settle();
    expect(reader.shown()).toEqual({ chapter: 213, page: 5 });
    expect(reader.shownTotal()).toBe(22);
  });

  it('keeps the caption on the outgoing page while a turn holds it, then follows the page', async () => {
    await open(7);
    reader.captionHold.set({ chapter: 214, page: 7 });
    reader.nextPage();
    expect(reader.lastGood()).toEqual(spot(8));
    expect(reader.shown()).toEqual({ chapter: 214, page: 7 });
    reader.captionHold.set(null);
    expect(reader.shown()).toEqual({ chapter: 214, page: 8 });
  });

  it('goes back to the last page from the end card', async () => {
    await open(19);
    reader.nextPage();
    await settle();
    reader.backFromEnd();
    expect(reader.screen()).toBe('image');
    expect(reader.imgSrc()).toBe(buildUrl('crimson_tide_ronin', 214, 19));
  });
});
