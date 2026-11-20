import { MOBILE_INSET, StripPlace, currentSlot, nextSlot, preloadTargets, prevSlot, slotDistance, turnsPage } from './strip';
import { buildUrl } from '../services/source';
import { containRect } from '../services/zoom-math';

const M = 'crimson_tide_ronin';
const url = (ch: number, pg: number) => buildUrl(M, ch, pg);

function place(page: number, opts: Partial<StripPlace> & { readyUrls?: string[] } = {}): StripPlace {
  const ready = new Set(opts.readyUrls ?? []);
  return { manga: M, chapter: 214, page, total: 19, prevTotal: 22, ready: u => ready.has(u), ...opts };
}

describe('strip slots', () => {
  it('shows the next page hidden once it has loaded, and turns to it page only', () => {
    const s = nextSlot(place(7, { readyUrls: [url(214, 8)] }));
    expect(s).toMatchObject({ kind: 'page', chapter: 214, page: 8, url: url(214, 8), action: 'nextPage' });
    expect(turnsPage(s)).toBe(true);
  });

  it('shows the screentone skeleton for a neighbour still loading (and it can still be turned to)', () => {
    expect(nextSlot(place(7))).toMatchObject({ kind: 'skeleton', page: 8, action: 'nextPage' });
    expect(prevSlot(place(7))).toMatchObject({ kind: 'skeleton', page: 6, action: 'prevPage' });
  });

  it('shows the previous page before the current one', () => {
    expect(prevSlot(place(7, { readyUrls: [url(214, 6)] }))).toMatchObject({ kind: 'page', page: 6, action: 'prevPage' });
  });

  it('puts the next-chapter teaser after the last page: the one neighbour click that changes chapter', () => {
    const s = nextSlot(place(19));
    expect(s).toMatchObject({ kind: 'teaser', chapter: 215, page: 1, action: 'nextChapter', url: null });
    expect(turnsPage(s)).toBe(false);
  });

  it("shows an inert \"no chapter yet\" slot instead of the teaser when the next chapter's first page 404'd", () => {
    const s = nextSlot(place(19, { missing: u => u === url(215, 1) }));
    expect(s).toMatchObject({ kind: 'empty', chapter: 215, action: null });
  });

  it('shows the next page, not a teaser, while the chapter length is unknown', () => {
    expect(nextSlot(place(19, { total: null }))).toMatchObject({ kind: 'skeleton', page: 20 });
  });

  it("on page 1 shows the previous chapter's last page when its length is known, never clickable", () => {
    const s = prevSlot(place(1, { readyUrls: [url(213, 22)] }));
    expect(s).toMatchObject({ kind: 'page', chapter: 213, page: 22, action: null });
    expect(turnsPage(s)).toBe(false);
  });

  it('leaves the slot before page 1 empty in chapter 1, or when the previous chapter length is unknown', () => {
    expect(prevSlot(place(1, { chapter: 1 }))).toMatchObject({ kind: 'empty', action: null, url: null });
    expect(prevSlot(place(1, { prevTotal: null }))).toMatchObject({ kind: 'empty', chapter: 214 });
  });

  it('keys page slots by their address, so a page keeps its drawing as it moves along the strip', () => {
    const before = nextSlot(place(7, { readyUrls: [url(214, 8)] }));
    const after = currentSlot(place(8), false);
    expect(after.key).toBe(before.key);
    expect(currentSlot(place(8), true).kind).toBe('skeleton');
  });
});

describe('preloadTargets', () => {
  it('fetches both neighbours ahead', () => {
    expect(preloadTargets(place(7))).toEqual([url(214, 8), url(214, 6)]);
  });

  it("on the last page fetches the next chapter's first page instead, and on page 1 the previous chapter's last", () => {
    expect(preloadTargets(place(19))).toEqual([url(215, 1), url(214, 18)]);
    expect(preloadTargets(place(1))).toEqual([url(214, 2), url(213, 22)]);
    expect(preloadTargets(place(1, { chapter: 1 }))).toEqual([buildUrl(M, 1, 2)]);
  });
});

describe('strip geometry', () => {
  it('leaves 14px slivers of the neighbours on a 390px phone', () => {
    const page = containRect({ w: 390, h: 844 }, { w: 700, h: 1000 }, MOBILE_INSET);
    expect(page).toMatchObject({ x: 20, w: 350 });
    const next = page.x + slotDistance(page.w, page.w, 6);
    expect(390 - next).toBe(14);
  });

  it('fills the desktop gutters 40px from the page', () => {
    const page = containRect({ w: 1440, h: 900 }, { w: 700, h: 1000 });
    const prevRight = page.x - slotDistance(page.w, page.w, 40) + page.w;
    expect(page.x - prevRight).toBe(40);
    expect(prevRight).toBeGreaterThan(300);
  });
});
