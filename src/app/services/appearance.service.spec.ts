import { TestBed } from '@angular/core/testing';
import {
  AppearanceService, BACKDROP_STORAGE, BASE_MAX_L, DEFAULT_BACKDROP, DOT_MAX_L, DRIFTS, NEIGHBOURS_STORAGE, SOLIDS,
  clampDark, lookOf, normalizeBackdrop,
} from './appearance.service';

/** HSL lightness of a #rrggbb colour. */
function lightness(hex: string) {
  const v = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  return (Math.max(...v) + Math.min(...v)) / 2;
}

describe('clampDark', () => {
  it('leaves dark colours alone', () => {
    expect(clampDark('#111a2e', BASE_MAX_L)).toBe('#111A2E');
  });

  it('darkens a colour that is too light, keeping its hue', () => {
    const out = clampDark('#7FB2FF', BASE_MAX_L)!;
    expect(lightness(out)).toBeCloseTo(BASE_MAX_L, 2);
    const [r, g, b] = [1, 3, 5].map(i => parseInt(out.slice(i, i + 2), 16));
    expect(b).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(r);
    expect(lightness(clampDark('#FFFFFF', BASE_MAX_L)!)).toBeLessThanOrEqual(BASE_MAX_L + 0.003);
  });

  it('allows the drift dots to be lighter than the base', () => {
    expect(lightness(clampDark('#FFFF00', DOT_MAX_L)!)).toBeCloseTo(DOT_MAX_L, 2);
  });

  it('rejects anything that is not a colour', () => {
    expect(clampDark('red', BASE_MAX_L)).toBeNull();
    expect(clampDark('#12345', BASE_MAX_L)).toBeNull();
  });

  it('keeps every preset as designed', () => {
    for (const s of SOLIDS) expect(clampDark(s.hex, BASE_MAX_L)).toBe(s.hex);
    for (const d of DRIFTS) {
      expect(clampDark(d.colours[0], BASE_MAX_L)).toBe(d.colours[0]);
      expect(clampDark(d.colours[1], DOT_MAX_L)).toBe(d.colours[1]);
      expect(clampDark(d.colours[2], DOT_MAX_L)).toBe(d.colours[2]);
    }
  });
});

describe('normalizeBackdrop', () => {
  it('falls back to the defaults for missing or broken settings', () => {
    expect(normalizeBackdrop(null)).toEqual(DEFAULT_BACKDROP);
    expect(normalizeBackdrop({ mode: 'neon', solid: 'pink', drift: 7, driftCustom: 'x' })).toEqual(DEFAULT_BACKDROP);
  });

  it('re-clamps stored custom colours (a hand-edited localStorage cannot make the page disappear)', () => {
    const b = normalizeBackdrop({ mode: 'solid', solid: 'custom', solidCustom: '#FFFFFF' });
    expect(lightness(b.solidCustom)).toBeLessThanOrEqual(BASE_MAX_L + 0.003);
  });
});

describe('lookOf', () => {
  it('draws nothing over the ink ground by default', () => {
    expect(lookOf(DEFAULT_BACKDROP).ink).toBe(true);
  });

  it('paints a preset drift with its three colours', () => {
    expect(lookOf({ ...DEFAULT_BACKDROP, mode: 'drift', drift: 'tide' })).toMatchObject({ mode: 'drift', ink: false, c1: '#0E2A30', c2: '#1B2C5C', c3: '#1F5A44' });
  });
});

describe('AppearanceService', () => {
  beforeEach(() => localStorage.clear());

  it('starts on Solid Ink with opaque neighbours', () => {
    const app = TestBed.inject(AppearanceService);
    expect(app.backdrop()).toEqual(DEFAULT_BACKDROP);
    expect(app.neighbours()).toBe('opaque');
    expect(app.neighbourAlpha()).toBe(1);
  });

  it('remembers the backdrop across a reload, as JSON', () => {
    const app = TestBed.inject(AppearanceService);
    app.setMode('drift');
    app.setDrift('ember');
    expect(JSON.parse(localStorage.getItem(BACKDROP_STORAGE)!)).toMatchObject({ mode: 'drift', drift: 'ember' });

    TestBed.resetTestingModule();
    expect(TestBed.inject(AppearanceService).look()).toMatchObject({ mode: 'drift', c1: '#2A0F14' });
  });

  it('stores a custom colour darkened, and says so', () => {
    const app = TestBed.inject(AppearanceService);
    expect(app.setSolidCustom('#F4F1EA')).toBe(true);
    expect(app.backdrop().solid).toBe('custom');
    expect(lightness(app.backdrop().solidCustom)).toBeLessThanOrEqual(BASE_MAX_L + 0.003);
    expect(app.setSolidCustom('#101018')).toBe(false);
    expect(app.backdrop().solidCustom).toBe('#101018');
  });

  it("turns a preset into Custom when one of its colours changes, starting from the preset's colours", () => {
    const app = TestBed.inject(AppearanceService);
    app.setMode('drift');
    app.setDrift('tide');
    app.setDriftColour(1, '#202060');
    expect(app.backdrop().drift).toBe('custom');
    expect(app.backdrop().driftCustom).toEqual(['#0E2A30', '#202060', '#1F5A44']);
  });

  it('sets how see-through the neighbours are, and remembers it', () => {
    const app = TestBed.inject(AppearanceService);
    app.setNeighbours('50');
    expect(app.neighbourAlpha()).toBe(0.5);
    expect(localStorage.getItem(NEIGHBOURS_STORAGE)).toBe('50');
    app.setNeighbours('25');
    expect(app.neighbourAlpha()).toBe(0.75);

    TestBed.resetTestingModule();
    expect(TestBed.inject(AppearanceService).neighbours()).toBe('25');
    TestBed.inject(AppearanceService).setNeighbours('opaque');
    expect(localStorage.getItem(NEIGHBOURS_STORAGE)).toBeNull();
  });

  it('ignores an unknown stored neighbour setting', () => {
    localStorage.setItem(NEIGHBOURS_STORAGE, '90');
    expect(TestBed.inject(AppearanceService).neighbours()).toBe('opaque');
  });
});
