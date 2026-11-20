/** Pure decisions for the page strip: what the slots beside the current page hold, where they sit, and
 *  which pages to load ahead. The neighbours are drawn hidden (no spoilers); see the strip rules in styles.css. */

/** page: a hidden neighbour whose image has loaded. skeleton: still loading. teaser: the next chapter, after
 *  the last page. empty: nothing before chapter 1's first page (or a previous chapter of unknown length). */
export type SlotKind = 'page' | 'skeleton' | 'teaser' | 'empty';

/** What clicking a neighbour does (desktop). Page only, except the teaser. */
export type NeighbourAction = 'prevPage' | 'nextPage' | 'nextChapter';

export interface Slot {
  kind: SlotKind;
  /** Stable identity: a page keeps its element (and its drawing) as it moves through the strip. */
  key: string;
  chapter: number;
  page: number;
  url: string | null;
  action: NeighbourAction | null;
}

/** A page's image address (SourceService.pageUrl). */
export type PageUrl = (manga: string, chapter: number, page: number) => string;

export interface StripPlace {
  manga: string;
  chapter: number;
  page: number;
  /** Makes page addresses from the page template in use. */
  url: PageUrl;
  /** Pages in this chapter, when known. */
  total: number | null;
  /** Pages in the previous chapter, when known. */
  prevTotal: number | null;
  /** Has this page's image arrived? */
  ready: (url: string) => boolean;
  /** Did fetching it ahead get a 404? */
  missing?: (url: string) => boolean;
}

/** Desktop: the neighbours fill the gutters 40px from the page. Mobile: the page is inset so 14px slivers show. */
export const STRIP_GAP = { desktop: 40, mobile: 6 } as const;
export const MOBILE_SLIVER = 14;
/** Mobile: horizontal space kept free on each side of the page at 100% (sliver + gap). */
export const MOBILE_INSET = MOBILE_SLIVER + STRIP_GAP.mobile;
/** Desktop, zoomed in: the current page's frame grows only so far that at least this much of each neighbour
 *  stays on screen (from the rail's edge while the panels are locked). */
export const DESKTOP_NEIGHBOUR_MIN = 72;
/** Right edge of the desktop rail (24px margin + 336px panels) plus a 24px gap. */
export const RAIL_EDGE = 384;

function pageSlot(p: StripPlace, chapter: number, page: number, action: NeighbourAction | null): Slot {
  const url = p.url(p.manga, chapter, page);
  return { kind: p.ready(url) ? 'page' : 'skeleton', key: url, chapter, page, url, action };
}

export function currentSlot(p: StripPlace, loading: boolean): Slot {
  const s = pageSlot(p, p.chapter, p.page, null);
  return loading ? { ...s, kind: 'skeleton' } : { ...s, kind: 'page' };
}

/** Before the current page: the page before it; on page 1 the previous chapter's last page (shown, hidden like
 *  any neighbour, but never clicked: a neighbour click never crosses a chapter), or nothing. */
export function prevSlot(p: StripPlace): Slot {
  if (p.page > 1) return pageSlot(p, p.chapter, p.page - 1, 'prevPage');
  if (p.chapter > 1 && p.prevTotal) return pageSlot(p, p.chapter - 1, p.prevTotal, null);
  return { kind: 'empty', key: `empty:${p.manga}:${p.chapter}`, chapter: p.chapter, page: 0, url: null, action: null };
}

/** After the current page: the next page, or on the chapter's known last page a teaser for the next chapter
 *  (the one neighbour click that changes chapter), unless that chapter is known not to exist yet: then an inert
 *  empty slot ("No chapter N yet"). */
export function nextSlot(p: StripPlace): Slot {
  if (p.total && p.page >= p.total) {
    if (p.missing?.(p.url(p.manga, p.chapter + 1, 1))) {
      return { kind: 'empty', key: `nonext:${p.manga}:${p.chapter + 1}`, chapter: p.chapter + 1, page: 0, url: null, action: null };
    }
    return { kind: 'teaser', key: `teaser:${p.manga}:${p.chapter + 1}`, chapter: p.chapter + 1, page: 1, url: null, action: 'nextChapter' };
  }
  return pageSlot(p, p.chapter, p.page + 1, 'nextPage');
}

/** A swipe or a neighbour click may turn onto it: page only, inside the chapter. */
export const turnsPage = (s: Slot) => s.action === 'prevPage' || s.action === 'nextPage';

/** Pages to load ahead so the next turn is instant: the neighbours, and the next chapter's first page once
 *  the end of this one is known (the keys and the bar roll into it). */
export function preloadTargets(p: Omit<StripPlace, 'ready'>): string[] {
  const out: string[] = [];
  if (p.total && p.page >= p.total) out.push(p.url(p.manga, p.chapter + 1, 1));
  else out.push(p.url(p.manga, p.chapter, p.page + 1));
  if (p.page > 1) out.push(p.url(p.manga, p.chapter, p.page - 1));
  else if (p.chapter > 1 && p.prevTotal) out.push(p.url(p.manga, p.chapter - 1, p.prevTotal));
  return out;
}

/** Distance between the centres of two neighbouring pages of widths a and b. */
export const slotDistance = (a: number, b: number, gap: number) => a / 2 + gap + b / 2;
