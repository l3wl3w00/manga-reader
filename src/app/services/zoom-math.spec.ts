import { TYPICAL_PAGE, clearRailOffset, fitView, visibleRegion, zoomAround } from './zoom-math';

describe('fitView', () => {
  it('opens a typical page at 167% in a 1440x900 window (60% height, 90% width)', () => {
    const v = fitView({ w: 1440, h: 900 }, TYPICAL_PAGE, { heightPct: 60, maxWidthPct: 90 });
    expect(Math.round(v.zoom * 100)).toBe(167);
    expect(v.panY).toBeCloseTo(0);
  });

  it('caps by max width on a phone (60% height, 150% width -> 150%)', () => {
    const v = fitView({ w: 390, h: 844 }, TYPICAL_PAGE, { heightPct: 60, maxWidthPct: 150 });
    expect(Math.round(v.zoom * 100)).toBe(150);
  });

  it('never zooms out below 100%', () => {
    expect(fitView({ w: 1440, h: 900 }, TYPICAL_PAGE, { heightPct: 100, maxWidthPct: 10 }).zoom).toBe(1);
  });
});

describe('zoomAround', () => {
  it('keeps the point under the cursor still', () => {
    const vp = { w: 1000, h: 800 };
    const v = zoomAround(vp, { zoom: 1, panX: 0, panY: 0 }, 2, 300, 200);
    expect(v).toEqual({ zoom: 2, panX: -300, panY: -200 });
  });

  it('resets the pan at 100% and clamps to 100-400%', () => {
    const vp = { w: 1000, h: 800 };
    expect(zoomAround(vp, { zoom: 2, panX: -300, panY: -200 }, 0.5, 0, 0)).toEqual({ zoom: 1, panX: 0, panY: 0 });
    expect(zoomAround(vp, { zoom: 1, panX: 0, panY: 0 }, 9, 500, 400).zoom).toBe(4);
  });
});

describe('visibleRegion', () => {
  const vp = { w: 1000, h: 1000 }, img = { w: 1000, h: 1000 };

  it('is the whole page at 100%', () => {
    expect(visibleRegion(vp, img, { zoom: 1, panX: 0, panY: 0 })).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it('is the bottom-right quarter when zoomed 2x and panned there', () => {
    expect(visibleRegion(vp, img, { zoom: 2, panX: -1000, panY: -1000 })).toEqual({ x: 0.5, y: 0.5, w: 0.5, h: 0.5 });
  });
});

describe('clearRailOffset', () => {
  // Regression: at 1024 px the locked panels covered the page's left edge.
  it('slides the page clear of the rail and centres it in the space left over', () => {
    const vp = { w: 1024, h: 700 };
    const dx = clearRailOffset(vp, TYPICAL_PAGE, 384);
    const left = (1024 - 490) / 2 + dx;
    expect(left).toBeGreaterThanOrEqual(384);
    expect(left + 490).toBeLessThanOrEqual(1024 - 24 + 0.001);
  });

  it('leaves the page alone when it already clears the rail', () => {
    expect(clearRailOffset({ w: 1440, h: 900 }, TYPICAL_PAGE, 384)).toBe(0);
  });

  it('pushes the page to the right edge when it cannot clear the rail', () => {
    expect(clearRailOffset({ w: 800, h: 900 }, TYPICAL_PAGE, 384)).toBeCloseTo((800 - 630) / 2);
  });
});
