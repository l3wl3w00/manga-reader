import { TestBed } from '@angular/core/testing';
import { ACTION_PRIORITY, KeybindingsService, PRESETS, closestPreset, findConflicts, formatKey } from './keybindings.service';

const defaults = () => ({ ...PRESETS[0].bindings });

describe('findConflicts', () => {
  it('finds none in any shipped preset', () => {
    for (const p of PRESETS) expect(findConflicts(p.bindings)).toEqual([]);
  });

  it('reports two actions on one key, with the action that fires first as the winner', () => {
    const b = { ...defaults(), panRight: { key: 'ArrowRight', ctrl: true } };
    expect(findConflicts(b)).toEqual([{ binding: { key: 'ArrowRight', ctrl: true }, winner: 'nextPage', losers: ['panRight'] }]);
  });

  it('agrees with the dispatch order of KeybindingsService.actionFor', () => {
    TestBed.configureTestingModule({});
    const kb = TestBed.inject(KeybindingsService);
    kb.bindings.set({ ...defaults(), fullscreen: { key: 'ArrowRight', ctrl: true } });
    const [c] = findConflicts(kb.bindings());
    expect(kb.actionFor(new KeyboardEvent('keydown', { key: 'ArrowRight', ctrlKey: true }))).toBe(c.winner);
    expect(ACTION_PRIORITY.indexOf(c.winner)).toBeLessThan(ACTION_PRIORITY.indexOf(c.losers[0]));
  });

  it('treats Ctrl as part of the key', () => {
    const b = { ...defaults(), panRight: { key: 'ArrowRight', ctrl: false } };
    expect(findConflicts(b)).toEqual([]);
  });
});

describe('closestPreset', () => {
  it('names the preset a custom set was edited from', () => {
    expect(closestPreset({ ...PRESETS[1].bindings, fullscreen: { key: 'g', ctrl: false } })).toBe('wasd');
    expect(closestPreset({ ...PRESETS[2].bindings, nextPage: { key: 'n', ctrl: false } })).toBe('eating');
  });
});

describe('formatKey', () => {
  it('writes keys the way the editor shows them', () => {
    expect(formatKey({ key: 'ArrowRight', ctrl: true })).toBe('Ctrl+→');
    expect(formatKey({ key: ' ', ctrl: false })).toBe('Space');
    expect(formatKey({ key: 'f', ctrl: false })).toBe('F');
    expect(formatKey({ key: 'Control', ctrl: true })).toBe('Ctrl');
  });
});

describe('KeybindingsService recording', () => {
  beforeEach(() => { localStorage.clear(); TestBed.configureTestingModule({}); });

  it('binds the next key, waits through lone modifiers, and marks the set custom', () => {
    const kb = TestBed.inject(KeybindingsService);
    kb.recordingAction.set('zoomIn');
    expect(kb.recordKey(new KeyboardEvent('keydown', { key: 'Control', ctrlKey: true }))).toBe(true);
    expect(kb.recordingAction()).toBe('zoomIn');
    kb.recordKey(new KeyboardEvent('keydown', { key: '=', ctrlKey: true }));
    expect(kb.bindings()['zoomIn']).toEqual({ key: '=', ctrl: true });
    expect(kb.recordingAction()).toBeNull();
    expect(kb.activePreset()).toBeNull();
    expect(JSON.parse(localStorage.getItem('manga-reader-bindings')!).zoomIn).toEqual({ key: '=', ctrl: true });
  });

  it('cancels on Escape without changing anything', () => {
    const kb = TestBed.inject(KeybindingsService);
    kb.recordingAction.set('zoomIn');
    kb.recordKey(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(kb.bindings()['zoomIn']).toEqual(PRESETS[0].bindings.zoomIn);
    expect(kb.recordingAction()).toBeNull();
  });
});
