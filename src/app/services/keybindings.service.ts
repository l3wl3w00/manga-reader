import { Injectable, signal } from '@angular/core';

export interface Binding { key: string; ctrl: boolean; }
export interface Bindings { [action: string]: Binding; }

export const ARROW_SYM: Record<string, string> = {
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', ' ': 'Space',
};

export const ACTION_LABELS: Record<string, string> = {
  nextPage: 'Next page', prevPage: 'Previous page',
  zoomIn: 'Zoom in', zoomOut: 'Zoom out',
  panUp: 'Pan up', panDown: 'Pan down', panLeft: 'Pan left', panRight: 'Pan right',
  jumpVert: 'Jump top/bottom', fullscreen: 'Fullscreen',
  togglePanels: 'Toggle panels', peekPanels: 'Peek panels',
};

export const ACTION_GROUPS = [
  { label: 'Navigation', actions: ['nextPage', 'prevPage', 'jumpVert'] },
  { label: 'Zoom',       actions: ['zoomIn', 'zoomOut'] },
  { label: 'Pan',        actions: ['panUp', 'panDown', 'panLeft', 'panRight'] },
  { label: 'Other',      actions: ['fullscreen'] },
  { label: 'View',       actions: ['togglePanels', 'peekPanels'] },
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

const KB_STORAGE     = 'manga-reader-bindings';
const PRESET_STORAGE = 'manga-reader-preset';
const NAMES_STORAGE  = 'manga-reader-preset-names';

@Injectable({ providedIn: 'root' })
export class KeybindingsService {
  bindings = signal<Bindings>(this.loadBindings());
  activePreset = signal<string | null>(
    localStorage.getItem(PRESET_STORAGE) || (!localStorage.getItem(KB_STORAGE) ? 'default' : null)
  );
  recordingAction = signal<string | null>(null);

  private loadBindings(): Bindings {
    try {
      const b = JSON.parse(localStorage.getItem(KB_STORAGE) || 'null');
      return b ? { ...PRESETS[0].bindings, ...b } : { ...PRESETS[0].bindings };
    } catch { return { ...PRESETS[0].bindings }; }
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

  formatKey(b: Binding | undefined): string {
    if (!b) return '—';
    if (b.key === 'Control') return 'Ctrl';
    return (b.ctrl ? 'Ctrl+' : '') + (ARROW_SYM[b.key] || b.key);
  }

  getPresetNames(): Record<string, string> {
    try { return JSON.parse(localStorage.getItem(NAMES_STORAGE) || '{}'); } catch { return {}; }
  }

  getPresetLabel(id: string): string {
    return this.getPresetNames()[id] || PRESETS.find(p => p.id === id)?.label || id;
  }

  savePresetName(id: string, name: string) {
    const names = this.getPresetNames();
    names[id] = name;
    localStorage.setItem(NAMES_STORAGE, JSON.stringify(names));
  }
}
