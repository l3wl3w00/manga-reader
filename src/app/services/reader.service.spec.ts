import { TestBed } from '@angular/core/testing';
import { ReaderService, Spot, buildUrl, classifyMiss } from './reader.service';

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

  it('shows the end of chapter, not a 404, when a click zone walks past the last page', async () => {
    await open(19);
    reader.nextPage();
    await settle();
    expect(reader.screen()).toBe('end');
    expect(reader.missed()).toEqual(spot(20));
    expect(reader.page()).toBe(19);
    expect(reader.totalPages()).toBe(19);
  });

  it('keeps click zones inside the chapter', async () => {
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

  it('goes back to the last page from the end card', async () => {
    await open(19);
    reader.nextPage();
    await settle();
    reader.backFromEnd();
    expect(reader.screen()).toBe('image');
    expect(reader.imgSrc()).toBe(buildUrl('crimson_tide_ronin', 214, 19));
  });
});
