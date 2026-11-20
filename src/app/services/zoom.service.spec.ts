import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LayoutService } from './layout.service';
import { ZoomService } from './zoom.service';

/** A 390x844 phone. */
function phone() {
  TestBed.configureTestingModule({
    providers: [{
      provide: LayoutService,
      useValue: { mobile: signal(true), finePointer: signal(false), viewport: signal({ w: 390, h: 844 }) },
    }],
  });
  const zoom = TestBed.inject(ZoomService);
  zoom.imageSize.set({ w: 700, h: 1000 });
  zoom.fitSettings.set({ heightPct: 60, maxWidthPct: 150 });
  return zoom;
}

describe('ZoomService on a phone', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the neighbour slivers when auto-fit is off: the frame never gets wider than the page', () => {
    const zoom = phone();
    zoom.autoFit.set(false);
    zoom.setZoom(2, 195, 400);
    expect(zoom.frame().w).toBeCloseTo(350);
  });

  it('lets auto-fit zoom a portrait page in, the frame taking the full width (owner\'s choice)', () => {
    const zoom = phone();
    zoom.autoFit.set(true);
    // 60% of the page's height on screen, up to 150% of the window wide: wider than the 350px page at 100%.
    expect(zoom.fitZoomFor({ w: 700, h: 1000 })).toBeGreaterThan(1);
    zoom.setZoom(2, 195, 400);
    expect(zoom.frame().w).toBe(390);
  });
});
