import { TestBed } from '@angular/core/testing';
import { GestureLayerComponent } from './gesture-layer.component';
import { ReaderService, buildUrl } from '../../services/reader.service';
import { UiService } from '../../services/ui.service';
import { ZoomService } from '../../services/zoom.service';
import { StripService } from '../../services/strip.service';
import { DOUBLE_TAP_MS } from '../../gestures/gestures';

const M = 'crimson_tide_ronin';

/** jsdom has no PointerEvent: a mouse event carrying a pointerId stands in. */
function pointer(el: HTMLElement, type: string, x: number, y = 400, id = 1) {
  const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(e, 'pointerId', { value: id });
  el.dispatchEvent(e);
}

describe('GestureLayerComponent (touch)', () => {
  let reader: ReaderService;
  let ui: UiService;
  let layer: HTMLElement;

  beforeEach(async () => {
    vi.useFakeTimers();
    localStorage.clear();
    reader = TestBed.inject(ReaderService);
    ui = TestBed.inject(UiService);
    const spot = { manga: M, chapter: 214, page: 7 };
    reader.manga.set(M); reader.chapter.set(214); reader.page.set(7); reader.totalPages.set(19);
    reader.lastGood.set(spot); reader.imgSrc.set(buildUrl(M, 214, 7)); reader.screen.set('image');
    vi.spyOn(reader, 'nextPage').mockImplementation(() => true);
    vi.spyOn(reader, 'prevPage').mockImplementation(() => true);
    const fixture = TestBed.createComponent(GestureLayerComponent);
    layer = fixture.nativeElement;
  });
  afterEach(() => vi.useRealTimers());

  function tap(x: number) {
    pointer(layer, 'pointerdown', x);
    pointer(layer, 'pointerup', x);
    vi.advanceTimersByTime(DOUBLE_TAP_MS + 10);
  }

  function swipe(dx: number, steps = 6) {
    const x0 = 600;
    pointer(layer, 'pointerdown', x0);
    for (let i = 1; i <= steps; i++) { vi.advanceTimersByTime(40); pointer(layer, 'pointermove', x0 + (dx * i) / steps); }
    vi.advanceTimersByTime(200); // a slow release: no flick
    pointer(layer, 'pointermove', x0 + dx);
    pointer(layer, 'pointerup', x0 + dx);
  }

  // Regression: a tap on the left or right 28% of the screen turned the page. A tap never turns the page.
  it('shows or hides the controls on a tap anywhere, edges included, and never turns the page', () => {
    const w = window.innerWidth;
    tap(w - 8);
    expect(ui.panelsLocked()).toBe(false);
    tap(8);
    expect(ui.panelsLocked()).toBe(true);
    tap(w / 2);
    expect(ui.panelsLocked()).toBe(false);
    expect(reader.nextPage).not.toHaveBeenCalled();
    expect(reader.prevPage).not.toHaveBeenCalled();
  });

  it('turns the page on a sideways swipe past 40% of a page', () => {
    const step = Math.abs(TestBed.inject(StripService).items().find(i => i.k === 1)!.x);
    swipe(-0.5 * step);
    expect(reader.nextPage).toHaveBeenCalledTimes(1);
    swipe(0.5 * step);
    expect(reader.prevPage).toHaveBeenCalledTimes(1);
  });

  it('drags the strip with the finger and springs back short of the mark', () => {
    const strip = TestBed.inject(StripService);
    const step = Math.abs(strip.items().find(i => i.k === 1)!.x);
    pointer(layer, 'pointerdown', 600);
    pointer(layer, 'pointermove', 560);
    pointer(layer, 'pointermove', 500);
    expect(strip.dragX()).toBe(-100);
    vi.advanceTimersByTime(300);
    pointer(layer, 'pointermove', 600 - 0.3 * step);
    pointer(layer, 'pointerup', 600 - 0.3 * step);
    expect(reader.nextPage).not.toHaveBeenCalled();
    expect(strip.dragX()).toBe(0);
  });

  it('pans instead of turning while zoomed in', () => {
    TestBed.inject(ZoomService).zoom.set(2);
    swipe(-500);
    expect(reader.nextPage).not.toHaveBeenCalled();
  });
});
