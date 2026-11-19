import { TestBed } from '@angular/core/testing';
import { MOTION_STORAGE, MotionService, effectiveMotion } from './motion.service';

describe('effectiveMotion', () => {
  it('follows the system by default, and full or reduced override it', () => {
    expect(effectiveMotion('system', true)).toBe('reduced');
    expect(effectiveMotion('system', false)).toBe('full');
    // KDE at "Instant" makes Chrome report reduced motion; Full must still animate.
    expect(effectiveMotion('full', true)).toBe('full');
    expect(effectiveMotion('reduced', false)).toBe('reduced');
  });
});

describe('MotionService', () => {
  beforeEach(() => { localStorage.clear(); delete document.documentElement.dataset['motion']; });

  it('marks <html> with the motion in effect as soon as it starts', () => {
    TestBed.inject(MotionService);
    expect(document.documentElement.dataset['motion']).toMatch(/^(full|reduced)$/);
  });

  it('remembers Full across a reload and applies it to <html>', () => {
    TestBed.inject(MotionService).set('full');
    TestBed.tick();
    expect(localStorage.getItem(MOTION_STORAGE)).toBe('full');
    expect(document.documentElement.dataset['motion']).toBe('full');

    TestBed.resetTestingModule();
    expect(TestBed.inject(MotionService).pref()).toBe('full');
  });

  it('forgets the override when set back to follow the system', () => {
    const motion = TestBed.inject(MotionService);
    motion.set('reduced');
    motion.set('system');
    expect(localStorage.getItem(MOTION_STORAGE)).toBe(null);
  });
});
