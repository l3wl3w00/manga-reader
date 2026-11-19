import { classifyStroke, isDoubleTap, pageAt, settleSwipe, swipeAction, tapZone } from './gestures';

describe('tapZone', () => {
  it('splits the width 28 / 44 / 28', () => {
    expect(tapZone(0, 390)).toBe('prev');
    expect(tapZone(108, 390)).toBe('prev');
    expect(tapZone(110, 390)).toBe('center');
    expect(tapZone(280, 390)).toBe('center');
    expect(tapZone(282, 390)).toBe('next');
    expect(tapZone(389, 390)).toBe('next');
  });
});

describe('classifyStroke', () => {
  it('sees a short, still touch as a tap', () => {
    expect(classifyStroke({ dx: 3, dy: -4, ms: 120 }, false)).toBe('tap');
  });

  it('ignores a still touch held too long (that is a long-press)', () => {
    expect(classifyStroke({ dx: 0, dy: 0, ms: 600 }, false)).toBe('none');
  });

  it('sees a fast horizontal stroke as a swipe', () => {
    expect(classifyStroke({ dx: -120, dy: 10, ms: 200 }, false)).toBe('swipe-left');
    expect(classifyStroke({ dx: 90, dy: -20, ms: 250 }, false)).toBe('swipe-right');
  });

  it('ignores mostly vertical, short or slow strokes', () => {
    expect(classifyStroke({ dx: -80, dy: 90, ms: 200 }, false)).toBe('none');
    expect(classifyStroke({ dx: -30, dy: 0, ms: 200 }, false)).toBe('none');
    expect(classifyStroke({ dx: -200, dy: 0, ms: 1200 }, false)).toBe('none');
  });

  it('never swipes while zoomed in: the drag pans instead', () => {
    expect(classifyStroke({ dx: -200, dy: 0, ms: 200 }, true)).toBe('none');
    expect(classifyStroke({ dx: 1, dy: 1, ms: 100 }, true)).toBe('tap');
  });
});

describe('swipeAction', () => {
  it('turns forward on a left swipe, back on a right swipe', () => {
    expect(swipeAction('swipe-left')).toBe('next');
    expect(swipeAction('swipe-right')).toBe('prev');
    expect(swipeAction('tap')).toBeNull();
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
