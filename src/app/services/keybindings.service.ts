import { Injectable, computed, signal } from '@angular/core';

export interface Binding { key: string; ctrl: boolean; }
export interface Bindings { [action: string]: Binding; }

export const ARROW_SYM: Record<string, string> = {
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', ' ': 'Space',
};

export const ACTION_LABELS: Record<string, string> = {
  nextPage: 'Next page', prevPage: 'Previous page',
  zoomIn: 'Zoom in', zoomOut: 'Zoom out',
  panUp: 'Pan up', panDown: 'Pan down', panLeft: 'Pan left', panRight: 'Pan right',
  jumpVert: 'Jump top / bottom', fullscreen: 'Fullscreen',
  togglePanels: 'Toggle panels', peekPanels: 'Peek panels',
};

/** Actions that act while the key is held. */
export const HOLD_ACTIONS = new Set(['peekPanels']);

export const ACTION_GROUPS = [
  { label: 'Navigation', column: 0, actions: ['nextPage', 'prevPage', 'jumpVert'] },
  { label: 'Zoom',       column: 0, actions: ['zoomIn', 'zoomOut'] },
  { label: 'Other',      column: 0, actions: ['fullscreen'] },
  { label: 'Pan',        column: 1, actions: ['panUp', 'panDown', 'panLeft', 'panRight'] },
  { label: 'View',       column: 1, actions: ['togglePanels', 'peekPanels'] },
];

/** The order key presses are matched in: when two actions share a key, the earlier one wins. */
export const ACTION_PRIORITY = [
  'fullscreen', 'jumpVert', 'togglePanels', 'peekPanels', 'nextPage', 'prevPage',
  'zoomIn', 'zoomOut', 'panRight', 'panLeft', 'panDown', 'panUp',
];

export const PRESETS = [
  { id: 'default', label: 'Default', bindings: {
    nextPage:   { key: 'ArrowRight', ctrl: true  },
    prevPage:   { key: 'ArrowLeft',  ctrl: true  },
    zoomIn:     { key: 'ArrowUp',    ctrl: true  },
    zoomOut:    { key: 'ArrowDown',  ctrl: true  },
    panUp:      { key: 'ArrowUp',    ctrl: false },
    panDown:    { key: 'ArrowDown',  ctrl: false },
    panLeft:    { key: 'ArrowLeft',  ctrl: false },
    panRight:   { key: 'ArrowRight', ctrl: false },
    jumpVert:     { key: ' ',          ctrl: false },
    fullscreen:   { key: 'f',          ctrl: false },
    togglePanels: { key: 'Control',    ctrl: true  },
    peekPanels:   { key: 'Tab',        ctrl: false },
  }},
  { id: 'wasd', label: 'WASD', bindings: {
    nextPage:   { key: 'd',          ctrl: false },
    prevPage:   { key: 'a',          ctrl: false },
    zoomIn:     { key: 'w',          ctrl: true  },
    zoomOut:    { key: 's',          ctrl: true  },
    panUp:      { key: 'w',          ctrl: false },
    panDown:    { key: 's',          ctrl: false },
    panLeft:    { key: 'ArrowLeft',  ctrl: false },
    panRight:   { key: 'ArrowRight', ctrl: false },
    jumpVert:     { key: ' ',          ctrl: false },
    fullscreen:   { key: 'f',          ctrl: false },
    togglePanels: { key: 'Control',    ctrl: true  },
    peekPanels:   { key: 'Tab',        ctrl: false },
  }},
  { id: 'eating', label: 'Eating', bindings: {
    nextPage:   { key: 'ArrowRight', ctrl: false },
    prevPage:   { key: 'ArrowLeft',  ctrl: false },
    zoomIn:     { key: 'ArrowUp',    ctrl: false },
    zoomOut:    { key: 'ArrowDown',  ctrl: false },
    panUp:      { key: 'ArrowUp',    ctrl: true  },
    panDown:    { key: 'ArrowDown',  ctrl: true  },
    panLeft:    { key: 'ArrowLeft',  ctrl: true  },
    panRight:   { key: 'ArrowRight', ctrl: true  },
    jumpVert:     { key: ' ',          ctrl: false },
    fullscreen:   { key: 'f',          ctrl: false },
    togglePanels: { key: 'Control',    ctrl: true  },
    peekPanels:   { key: 'Tab',        ctrl: false },
  }},
];

export interface Conflict {
  binding: Binding;
  /** The action that fires. */
  winner: string;
  /** Actions on the same key that never fire. */
  losers: string[];
}

/** Same identity as KeybindingsService.matches(): exact key, plus whether Ctrl is held. */
const comboId = (b: Binding) => `${b.ctrl ? 'C+' : ''}${b.key}`;

/** Groups actions bound to the same key combination. The winner is the first in match order. */
export function findConflicts(bindings: Bindings, priority: string[] = ACTION_PRIORITY): Conflict[] {
  const byCombo = new Map<string, string[]>();
  for (const action of priority) {
    const b = bindings[action];
    if (!b) continue;
    const id = comboId(b);
    byCombo.set(id, [...(byCombo.get(id) ?? []), action]);
  }
  return [...byCombo.values()]
    .filter(actions => actions.length > 1)
    .map(([winner, ...losers]) => ({ binding: bindings[winner], winner, losers }));
}

/** The preset sharing the most bindings with these; ties go to the earlier preset. */
export function closestPreset(bindings: Bindings): string {
  let best = PRESETS[0].id, bestScore = -1;
  for (const p of PRESETS) {
    const score = Object.entries(p.bindings)
      .filter(([action, b]) => bindings[action] && comboId(bindings[action]) === comboId(b)).length;
    if (score > bestScore) { best = p.id; bestScore = score; }
  }
  return best;
}

export function formatKey(b: Binding | undefined): string {
  if (!b) return '—';
  if (b.key === 'Control') return 'Ctrl';
  const key = ARROW_SYM[b.key] ?? (b.key.length === 1 ? b.key.toUpperCase() : b.key);
  return (b.ctrl ? 'Ctrl+' : '') + key;
}

const KB_STORAGE     = 'manga-reader-bindings';
const PRESET_STORAGE = 'manga-reader-preset';
const NAMES_STORAGE  = 'manga-reader-preset-names';

@Injectable({ providedIn: 'root' })
export class KeybindingsService {
  readonly bindings = signal<Bindings>(this.loadBindings());
  readonly activePreset = signal<string | null>(
    localStorage.getItem(PRESET_STORAGE) || (!localStorage.getItem(KB_STORAGE) ? 'default' : null)
  );
  readonly recordingAction = signal<string | null>(null);
  readonly presetNames = signal<Record<string, string>>(this.loadPresetNames());

  readonly conflicts = computed(() => findConflicts(this.bindings()));
  /** For a custom set: the preset it was most likely edited from. */
  readonly basePreset = computed(() => closestPreset(this.bindings()));

  private loadBindings(): Bindings {
    try {
      const b = JSON.parse(localStorage.getItem(KB_STORAGE) || 'null');
      return b ? { ...PRESETS[0].bindings, ...b } : { ...PRESETS[0].bindings };
    } catch { return { ...PRESETS[0].bindings }; }
  }

  private loadPresetNames(): Record<string, string> {
    try { return JSON.parse(localStorage.getItem(NAMES_STORAGE) || '{}') ?? {}; } catch { return {}; }
  }

  save() { localStorage.setItem(KB_STORAGE, JSON.stringify(this.bindings())); }

  applyPreset(id: string) {
    const p = PRESETS.find(p => p.id === id); if (!p) return;
    this.bindings.set({ ...p.bindings });
    this.activePreset.set(id);
    this.save();
    localStorage.setItem(PRESET_STORAGE, id);
  }

  setBinding(action: string, binding: Binding) {
    this.bindings.update(b => ({ ...b, [action]: binding }));
    this.activePreset.set(null);
    localStorage.removeItem(PRESET_STORAGE);
    this.save();
  }

  matches(e: KeyboardEvent, action: string): boolean {
    const b = this.bindings()[action];
    return !!b && e.key === b.key && !!e.ctrlKey === !!b.ctrl;
  }

  /** While recording: Esc cancels, lone modifiers wait, any other key is bound. True if it consumed the key. */
  recordKey(e: KeyboardEvent): boolean {
    const action = this.recordingAction();
    if (!action) return false;
    e.preventDefault();
    if (e.key === 'Escape') { this.recordingAction.set(null); return true; }
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return true;
    this.setBinding(action, { key: e.key, ctrl: e.ctrlKey });
    this.recordingAction.set(null);
    return true;
  }

  /** The action a key press triggers, in ACTION_PRIORITY order. */
  actionFor(e: KeyboardEvent): string | null {
    return ACTION_PRIORITY.find(a => this.matches(e, a)) ?? null;
  }

  formatKey(b: Binding | undefined): string { return formatKey(b); }
  keyFor(action: string): string { return formatKey(this.bindings()[action]); }

  getPresetLabel(id: string): string {
    return this.presetNames()[id] || PRESETS.find(p => p.id === id)?.label || id;
  }

  savePresetName(id: string, name: string) {
    this.presetNames.update(n => ({ ...n, [id]: name }));
    localStorage.setItem(NAMES_STORAGE, JSON.stringify(this.presetNames()));
  }
}
