import { Injectable, computed, signal } from '@angular/core';

export const BACKDROP_STORAGE = 'manga-reader-backdrop';
export const NEIGHBOURS_STORAGE = 'manga-reader-neighbours';

/** Solid: one flat print colour. Drift: two or three colours as halftone dot fields that slide past each other. */
export type BackdropMode = 'solid' | 'drift';
export type SolidId = 'ink' | 'indigo' | 'oxblood' | 'moss' | 'kraft' | 'slate';
export type DriftId = 'dusk' | 'tide' | 'ember' | 'moss';

/** Deep print colours (the same values are the --color-bd-* tokens in styles.css). */
export const SOLIDS: { id: SolidId; name: string; hex: string }[] = [
  { id: 'ink', name: 'Ink', hex: '#0B0B0C' },
  { id: 'indigo', name: 'Indigo', hex: '#111A2E' },
  { id: 'oxblood', name: 'Oxblood', hex: '#2A0F14' },
  { id: 'moss', name: 'Moss', hex: '#10201A' },
  { id: 'kraft', name: 'Kraft', hex: '#2B241B' },
  { id: 'slate', name: 'Slate', hex: '#1C1F24' },
];
export type Trio = [string, string, string];
export const DRIFTS: { id: DriftId; name: string; colours: Trio; note: string }[] = [
  { id: 'dusk', name: 'Dusk', colours: ['#111A2E', '#5A1A2A', '#7A4A12'], note: 'Wine and amber over indigo' },
  { id: 'tide', name: 'Tide', colours: ['#0E2A30', '#1B2C5C', '#1F5A44'], note: 'Blue and green over deep teal' },
  { id: 'ember', name: 'Ember', colours: ['#2A0F14', '#7A2A10', '#7A5A12'], note: 'Rust and ochre over oxblood' },
  { id: 'moss', name: 'Moss', colours: ['#10201A', '#3A4A14', '#14463C'], note: 'Olive and pine over moss' },
];

export interface Backdrop {
  mode: BackdropMode;
  solid: SolidId | 'custom';
  solidCustom: string;
  drift: DriftId | 'custom';
  driftCustom: Trio;
}
export const DEFAULT_BACKDROP: Backdrop = {
  mode: 'solid', solid: 'ink', solidCustom: '#1A1A24', drift: 'dusk', driftCustom: [...DRIFTS[0].colours],
};

/** How see-through the hidden neighbour pages are: opaque (default), or 25% / 50% of the backdrop through. */
export type NeighbourOpacity = 'opaque' | '25' | '50';
export const NEIGHBOUR_ALPHA: Record<NeighbourOpacity, number> = { opaque: 1, '25': 0.75, '50': 0.5 };

/** Lightest a backdrop base may be (HSL lightness), so the page always stands out. The darkest preset base,
 *  Kraft, sits at 14%. */
export const BASE_MAX_L = 0.16;
/** Lightest a drift dot colour may be: the presets' dots go up to 28%. */
export const DOT_MAX_L = 0.3;

const HEX = /^#[0-9a-f]{6}$/i;

/** `hex` with its HSL lightness held at or below maxL (hue and saturation kept). Invalid input gives null. */
export function clampDark(hex: string, maxL: number): string | null {
  if (!HEX.test(hex)) return null;
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (l <= maxL) return hex.toUpperCase();
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return hslHex(h * 60, s, maxL);
}

function hslHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((((h % 360) + 360) % 360) / 60) % 2 - 1));
  const m = l - c / 2;
  const hh = (((h % 360) + 360) % 360) / 60;
  const [r, g, b] = hh < 1 ? [c, x, 0] : hh < 2 ? [x, c, 0] : hh < 3 ? [0, c, x] : hh < 4 ? [0, x, c] : hh < 5 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Any stored shape made safe: unknown ids fall back to the defaults, custom colours are re-clamped. */
export function normalizeBackdrop(raw: unknown): Backdrop {
  const b = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Backdrop, unknown>>;
  const d = DEFAULT_BACKDROP;
  const solidIds: string[] = [...SOLIDS.map(s => s.id), 'custom'];
  const driftIds: string[] = [...DRIFTS.map(s => s.id), 'custom'];
  const trio = Array.isArray(b.driftCustom) && b.driftCustom.length === 3 ? b.driftCustom as unknown[] : d.driftCustom;
  return {
    mode: b.mode === 'drift' ? 'drift' : 'solid',
    solid: (typeof b.solid === 'string' && solidIds.includes(b.solid) ? b.solid : d.solid) as Backdrop['solid'],
    solidCustom: clampDark(String(b.solidCustom), BASE_MAX_L) ?? d.solidCustom,
    drift: (typeof b.drift === 'string' && driftIds.includes(b.drift) ? b.drift : d.drift) as Backdrop['drift'],
    driftCustom: trio.map((c, i) => clampDark(String(c), i ? DOT_MAX_L : BASE_MAX_L) ?? d.driftCustom[i]) as Trio,
  };
}

/** The colours a backdrop paints with. ink: today's dotted ink ground (nothing drawn on top). */
export interface BackdropLook { mode: BackdropMode; ink: boolean; c1: string; c2: string; c3: string; }

export function lookOf(b: Backdrop): BackdropLook {
  if (b.mode === 'solid') {
    const hex = b.solid === 'custom' ? b.solidCustom : SOLIDS.find(s => s.id === b.solid)!.hex;
    return { mode: 'solid', ink: b.solid === 'ink', c1: hex, c2: hex, c3: hex };
  }
  const [c1, c2, c3] = driftColours(b);
  return { mode: 'drift', ink: false, c1, c2, c3 };
}

export function driftColours(b: Backdrop): Trio {
  return b.drift === 'custom' ? b.driftCustom : DRIFTS.find(d => d.id === b.drift)!.colours;
}

function read<T>(key: string, parse: (raw: string | null) => T): T {
  try { return parse(localStorage.getItem(key)); } catch { return parse(null); }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* private mode: for this visit only */ }
}

/** Appearance settings: the backdrop behind the pages and how see-through the hidden neighbours are. */
@Injectable({ providedIn: 'root' })
export class AppearanceService {
  readonly backdrop = signal<Backdrop>(read(BACKDROP_STORAGE, raw => normalizeBackdrop(raw ? JSON.parse(raw) : null)));
  readonly neighbours = signal<NeighbourOpacity>(read(NEIGHBOURS_STORAGE, raw => (raw === '25' || raw === '50' ? raw : 'opaque')));

  readonly look = computed(() => lookOf(this.backdrop()));
  readonly neighbourAlpha = computed(() => NEIGHBOUR_ALPHA[this.neighbours()]);

  private update(patch: Partial<Backdrop>) {
    this.backdrop.update(b => ({ ...b, ...patch }));
    write(BACKDROP_STORAGE, JSON.stringify(this.backdrop()));
  }

  setMode(mode: BackdropMode) { this.update({ mode }); }
  setSolid(solid: SolidId | 'custom') { this.update({ solid }); }
  setDrift(drift: DriftId | 'custom') { this.update({ drift }); }

  /** Sets the custom solid colour (and selects it). Returns true when it had to be darkened. */
  setSolidCustom(hex: string): boolean {
    const safe = clampDark(hex, BASE_MAX_L);
    if (!safe) return false;
    this.update({ solid: 'custom', solidCustom: safe });
    return safe !== hex.toUpperCase();
  }

  /** Changes one drift colour (0 base, 1 and 2 the dot fields). Changing a preset's colour makes it Custom,
   *  starting from that preset. Returns true when the colour had to be darkened. */
  setDriftColour(i: 0 | 1 | 2, hex: string): boolean {
    const safe = clampDark(hex, i ? DOT_MAX_L : BASE_MAX_L);
    if (!safe) return false;
    const trio = [...driftColours(this.backdrop())] as Trio;
    trio[i] = safe;
    this.update({ drift: 'custom', driftCustom: trio });
    return safe !== hex.toUpperCase();
  }

  setNeighbours(v: NeighbourOpacity) {
    this.neighbours.set(v);
    try {
      if (v === 'opaque') localStorage.removeItem(NEIGHBOURS_STORAGE);
      else localStorage.setItem(NEIGHBOURS_STORAGE, v);
    } catch { /* private mode: for this visit only */ }
  }
}
