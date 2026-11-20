import {
  FrameGeometry, TYPICAL_PAGE, clampPan, clearRailOffset, containRect, fitView, frameAt, maxFrameWidth, visibleRegion,
  zoomAround,
} from './zoom-math';

/** 1440x900 desktop, panels away: a typical page is 630 wide; 72px of each neighbour must stay, 40px away. */
const desk: FrameGeometry = {
  page: containRect({ w: 1440, h: 900 }, TYPICAL_PAGE), maxW: maxFrameWidth(720, 0, 1440, 40, 72), vpH: 900,
};
/** 390x844 phone: the page is inset 20px (a 14px sliver and a 6px gap each side). */
const phone: FrameGeometry = {
  page: containRect({ w: 390, h: 844 }, TYPICAL_PAGE, 20), maxW: maxFrameWidth(195, 0, 390, 6, 14), vpH: 844,
};

describe('frameAt (the current page\'s frame)', () => {
  it('is the page at 100%', () => {
    expect(frameAt(desk, 1)).toEqual(desk.page);
  });

  it('grows with the zoom, the window tall at most', () => {
    expect(frameAt(desk, 1.5)).toEqual({ x: 720 - 472.5, y: 0, w: 945, h: 900 });
  });

  it('stops growing where 72px of each neighbour would still show', () => {
    const f = frameAt(desk, 3);
    expect(f.w).toBe(1216);
    expect(f.x - 40).toBe(72); // the previous page's visible strip, left of the 40px gap
  });

  it('measures from the rail\'s edge while the panels are locked', () => {
    const off = 180; // clearRailOffset at 1440x900
    const g = { ...desk, maxW: maxFrameWidth(720, 384 - off, 1440 - off, 40, 72) };
    const f = frameAt(g, 4);
    expect(f.x + off - 40 - 384).toBe(72);
  });

  it('keeps 72px from the rail even where the page at 100% is wider than that allows (1024, panels locked)', () => {
    const vp = { w: 1024, h: 700 }, page = containRect(vp, TYPICAL_PAGE);
    const off = clearRailOffset(vp, TYPICAL_PAGE, 384), centre = page.x + page.w / 2;
    const g = { page, maxW: maxFrameWidth(centre, 384 - off, 1024 - off, 40, 72), vpH: 700 };
    expect(g.maxW).toBeLessThan(page.w);
    expect(frameAt(g, 1).w).toBe(page.w);
    const f = frameAt(g, 2);
    expect(f.x + off - 40 - 384).toBeCloseTo(72);
  });

  it('keeps the 14px slivers on a phone: the frame only grows taller', () => {
    expect(frameAt(phone, 2)).toEqual({ x: 20, y: 0, w: 350, h: 844 });
  });
});

describe('clampPan (pan clamps to the frame, not the window)', () => {
  it('keeps the frame covered by the zoomed page', () => {
    // 2x: the page is 1260x1800 in a 1216x900 frame.
    expect(clampPan(desk, { zoom: 2, panX: -5000, panY: -5000 })).toEqual({ zoom: 2, panX: -44, panY: -900 });
    expect(clampPan(desk, { zoom: 2, panX: 300, panY: 300 })).toEqual({ zoom: 2, panX: 0, panY: 0 });
  });

  it('pans a zoomed phone page sideways only within its 350px frame', () => {
    expect(clampPan(phone, { zoom: 2, panX: -1000, panY: 0 }).panX).toBe(-350);
  });

  it('centres the page while it still fits the frame', () => {
    expect(clampPan(desk, { zoom: 1.5, panX: -100, panY: 0 }).panX).toBe(0);
  });
});

describe('fitView', () => {
  it('opens a typical page at 167% in a 1440x900 window (60% height, 90% width)', () => {
    const v = fitView(desk, { heightPct: 60, maxWidthPct: 90 }, 1440);
    expect(Math.round(v.zoom * 100)).toBe(167);
    expect(v.panY).toBe(0);
  });

  it('caps the width by the neighbour strips, whatever the max width % says', () => {
    const v = fitView(desk, { heightPct: 10, maxWidthPct: 200 }, 1440);
    expect(630 * v.zoom).toBeCloseTo(1216);
    expect(frameAt(desk, v.zoom).w).toBeCloseTo(1216);
  });

  it('never zooms out below 100%, and cannot widen a phone page past its slivers', () => {
    expect(fitView(desk, { heightPct: 100, maxWidthPct: 10 }, 1440).zoom).toBe(1);
    expect(fitView(phone, { heightPct: 60, maxWidthPct: 150 }, 390).zoom).toBe(1);
  });
});

describe('zoomAround', () => {
  it('keeps the point under the cursor still once the frame is at its cap', () => {
    const v = clampPan(desk, { zoom: 3, panX: -400, panY: -600 });
    const z = zoomAround(desk, v, 3.5, 700, 450);
    const before = (700 - frameAt(desk, 3).x - v.panX) / 3;
    const after = (700 - frameAt(desk, 3.5).x - z.panX) / 3.5;
    expect(after).toBeCloseTo(before);
  });

  it('resets the pan at 100% and clamps to 100-400%', () => {
    expect(zoomAround(desk, { zoom: 2, panX: -30, panY: -200 }, 0.5, 0, 0)).toEqual({ zoom: 1, panX: 0, panY: 0 });
    expect(zoomAround(desk, { zoom: 1, panX: 0, panY: 0 }, 9, 500, 400).zoom).toBe(4);
  });
});

describe('visibleRegion (minimap)', () => {
  it('is the whole page at 100%', () => {
    expect(visibleRegion(phone, { zoom: 1, panX: 0, panY: 0 })).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it('is the part of the page inside the frame', () => {
    // 2x on the phone: a 700x1000 page in a 350x844 frame, panned to the bottom right.
    const r = visibleRegion(phone, { zoom: 2, panX: -350, panY: -156 });
    expect(r.x).toBeCloseTo(0.5); expect(r.w).toBeCloseTo(0.5);
    expect(r.y).toBeCloseTo(0.156); expect(r.h).toBeCloseTo(0.844);
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

  it('re-centres the page right of the rail even when it already clears it (the strip shifts about 190px)', () => {
    const dx = clearRailOffset({ w: 1440, h: 900 }, TYPICAL_PAGE, 384);
    expect(dx).toBe(180);
    expect((1440 - 630) / 2 + dx + 630 / 2).toBe(384 + (1440 - 384 - 24) / 2);
  });

  it('pushes the page to the right edge when it cannot clear the rail', () => {
    expect(clearRailOffset({ w: 800, h: 900 }, TYPICAL_PAGE, 384)).toBeCloseTo((800 - 630) / 2);
  });
});
