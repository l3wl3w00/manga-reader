import {
  FLICK_MIN, FLICK_SPEED, RUBBER, SNAP_RATIO, dragOffset, flickVelocity, isArmed, isDoubleTap, isTap, pageAt, settleSwipe,
  swipeAxis, swipeSnap,
} from './gestures';

describe('isTap', () => {
  it('sees a short, still touch as a tap', () => {
    expect(isTap({ dx: 3, dy: -4, ms: 120 })).toBe(true);
  });

  it('is not a tap when held (a long-press) or moved (a drag)', () => {
    expect(isTap({ dx: 0, dy: 0, ms: 600 })).toBe(false);
    expect(isTap({ dx: 30, dy: 0, ms: 100 })).toBe(false);
  });
});

describe('swipeAxis', () => {
  it('drags the strip only for a mostly sideways stroke', () => {
    expect(swipeAxis(-40, 12)).toBe('x');
    expect(swipeAxis(20, -60)).toBe('y');
  });
});

describe('swipe snap and threshold', () => {
  const step = 356; // a 350px page plus the 6px gap (390px phone)

  it('arms (and sharpens the incoming page) from 40% of a page', () => {
    expect(SNAP_RATIO).toBe(0.4);
    expect(isArmed(-0.39 * step, step)).toBe(false);
    expect(isArmed(-0.4 * step, step)).toBe(true);
    expect(isArmed(0.45 * step, step)).toBe(true);
  });

  it('snaps on past the mark, whatever the speed at the end', () => {
    expect(swipeSnap(-0.42 * step, 0, step)).toBe('next');
    expect(swipeSnap(0.5 * step, -0.2, step)).toBe('prev');
  });

  it('springs back short of the mark on a slow release', () => {
    expect(swipeSnap(-0.35 * step, -0.1, step)).toBe('back');
    expect(swipeSnap(0.2 * step, 0.1, step)).toBe('back');
  });

  it('turns on a flick short of the mark, but only a flick the same way the finger went', () => {
    expect(swipeSnap(-60, -FLICK_SPEED - 0.1, step)).toBe('next');
    expect(swipeSnap(60, FLICK_SPEED + 0.1, step)).toBe('prev');
    expect(swipeSnap(-60, FLICK_SPEED + 0.5, step)).toBe('back');
    expect(swipeSnap(-(FLICK_MIN - 4), -2, step)).toBe('back');
  });
});

describe('dragOffset', () => {
  it('follows the finger one to one toward a page it can turn to, up to one page', () => {
    expect(dragOffset(-120, 356, true, true)).toBe(-120);
    expect(dragOffset(-500, 356, true, true)).toBe(-356);
  });

  it('only gives a little toward a slot it cannot turn to (page 1, the chapter end)', () => {
    expect(dragOffset(100, 356, false, true)).toBe(100 * RUBBER);
    expect(dragOffset(-100, 356, true, false)).toBe(-100 * RUBBER);
  });
});

describe('flickVelocity', () => {
  it('measures the last 100ms of the stroke', () => {
    expect(flickVelocity([{ x: 300, t: 0 }, { x: 290, t: 200 }, { x: 250, t: 260 }, { x: 200, t: 300 }])).toBeCloseTo(-0.9);
    expect(flickVelocity([{ x: 10, t: 0 }])).toBe(0);
  });
});

describe('isDoubleTap', () => {
  it('needs a second tap soon and close by', () => {
    const first = { x: 100, y: 100, t: 1000 };
    expect(isDoubleTap(first, 110, 105, 1200)).toBe(true);
    expect(isDoubleTap(first, 110, 105, 1400)).toBe(false);
    expect(isDoubleTap(first, 200, 100, 1100)).toBe(false);
    expect(isDoubleTap(null, 100, 100, 1100)).toBe(false);
  });
});

describe('settleSwipe', () => {
  it('opens a closed row past a third of the actions, keeps an open row unless dragged back far', () => {
    expect(settleSwipe(-70, 168, false)).toBe(true);
    expect(settleSwipe(-40, 168, false)).toBe(false);
    expect(settleSwipe(-140, 168, true)).toBe(true);
    expect(settleSwipe(-90, 168, true)).toBe(false);
  });
});

describe('pageAt', () => {
  it('maps a position on the scrubber to a page', () => {
    expect(pageAt(0, 190, 19)).toBe(1);
    expect(pageAt(65, 190, 19)).toBe(7);
    expect(pageAt(189.9, 190, 19)).toBe(19);
    expect(pageAt(400, 190, 19)).toBe(19);
    expect(pageAt(-20, 190, 19)).toBe(1);
  });
});
