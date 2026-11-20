import { TestBed } from '@angular/core/testing';
import { StripService } from './strip.service';
import { ReaderService, buildUrl } from './reader.service';
import { ZoomService } from './zoom.service';
import { UiService } from './ui.service';
import { DESKTOP_NEIGHBOUR_MIN, STRIP_GAP } from '../strip/strip';

const M = 'crimson_tide_ronin';

describe('StripService with the page zoomed (desktop)', () => {
  let strip: StripService;
  let zoom: ZoomService;

  beforeEach(() => {
    localStorage.clear();
    const reader = TestBed.inject(ReaderService);
    reader.manga.set(M); reader.chapter.set(214); reader.page.set(7); reader.totalPages.set(19);
    reader.lastGood.set({ manga: M, chapter: 214, page: 7 }); reader.imgSrc.set(buildUrl(M, 214, 7)); reader.screen.set('image');
    TestBed.inject(UiService).panelsLocked.set(false);
    zoom = TestBed.inject(ZoomService);
    zoom.imageSize.set({ w: 700, h: 1000 });
    strip = TestBed.inject(StripService);
  });

  const item = (k: number) => strip.items().find(i => i.k === k)!;
  const vw = () => window.innerWidth;

  it('frames the current page with the page itself at 100%', () => {
    expect(item(0).box).toEqual(item(0).rect);
  });

  it('moves the neighbours out with the growing frame, one gap away', () => {
    zoom.setZoom(1.4, vw() / 2, 300);
    const cur = item(0), next = item(1), prev = item(-1);
    expect(cur.box.w).toBeGreaterThan(cur.rect.w);
    // The next page's left edge sits one gap right of the frame, the previous page's right edge one gap left.
    expect(cur.box.x + cur.box.w + STRIP_GAP.desktop).toBeCloseTo(next.rect.x + next.x);
    expect(cur.box.x - STRIP_GAP.desktop).toBeCloseTo(prev.rect.x + prev.x + prev.rect.w);
  });

  it('keeps a strip of each neighbour on screen however far it zooms', () => {
    zoom.setZoom(4, vw() / 2, 300);
    const next = item(1), prev = item(-1);
    expect(vw() - (next.rect.x + next.x)).toBeCloseTo(DESKTOP_NEIGHBOUR_MIN);
    expect(prev.rect.x + prev.x + prev.rect.w).toBeCloseTo(DESKTOP_NEIGHBOUR_MIN);
  });

  it('clamps the pan to the frame, not the window', () => {
    zoom.setZoom(2, vw() / 2, 300);
    zoom.panBy(-10_000, -10_000);
    const f = zoom.frame(), page = item(0).rect;
    expect(zoom.panX()).toBeCloseTo(f.w - page.w * 2);
    expect(zoom.panY()).toBeCloseTo(f.h - page.h * 2);
    zoom.panBy(10_000, 10_000);
    expect([zoom.panX(), zoom.panY()]).toEqual([0, 0]);
  });
});
