import { Component, ElementRef, afterRenderEffect, computed, inject, signal, viewChild } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import {
  ACTION_GROUPS, ACTION_LABELS, HOLD_ACTIONS, KeybindingsService, PRESETS, formatKey,
} from '../../../services/keybindings.service';
import { LayoutService } from '../../../services/layout.service';
import { ICONS } from '../../../ui/icons';

export const PRESET_NAME_MAX = 24;

/** Key binding editor: presets (with renaming), recording, and conflicts. */
@Component({
  selector: 'app-keybindings-tab',
  imports: [LucideDynamicIcon],
  host: { class: 'flex flex-col' },
  templateUrl: './keybindings-tab.component.html',
})
export class KeybindingsTabComponent {
  protected kb = inject(KeybindingsService);
  protected layout = inject(LayoutService);
  protected readonly icons = ICONS;
  protected readonly presets = PRESETS;
  protected readonly labels = ACTION_LABELS;
  protected readonly hold = HOLD_ACTIONS;
  protected readonly nameMax = PRESET_NAME_MAX;
  protected readonly columns = [0, 1].map(c => ACTION_GROUPS.filter(g => g.column === c));
  protected readonly formatKey = formatKey;

  /** Reset only does something once the bindings were edited away from a preset. */
  protected readonly canReset = computed(() => this.kb.activePreset() === null);

  protected readonly renaming = signal<string | null>(null);
  protected readonly renameValue = signal('');
  private readonly renameInput = viewChild<ElementRef<HTMLInputElement>>('renameInput');

  constructor() {
    afterRenderEffect(() => this.renameInput()?.nativeElement.select());
  }

  /** action -> the action it clashes with, for every action involved in a conflict. */
  protected readonly clashes = computed(() => {
    const map = new Map<string, string>();
    for (const c of this.kb.conflicts()) {
      for (const loser of c.losers) { map.set(loser, c.winner); map.set(c.winner, loser); }
    }
    return map;
  });
  protected readonly losers = computed(() => new Set(this.kb.conflicts().flatMap(c => c.losers)));
  /** Binding before the current recording started, shown as "was ...". */
  protected readonly recordingWas = computed(() => {
    const a = this.kb.recordingAction();
    return a ? formatKey(this.kb.bindings()[a]) : '';
  });

  protected applyPreset(id: string) { this.kb.recordingAction.set(null); this.kb.applyPreset(id); }

  protected record(action: string) {
    this.kb.recordingAction.set(this.kb.recordingAction() === action ? null : action);
  }

  protected startRename(id: string) {
    this.renaming.set(id);
    this.renameValue.set(this.kb.getPresetLabel(id));
  }

  protected commitRename() {
    const id = this.renaming(), name = this.renameValue().trim();
    if (id && name) this.kb.savePresetName(id, name.slice(0, PRESET_NAME_MAX));
    this.renaming.set(null);
  }

  protected cancelRename(e: Event) { e.stopPropagation(); this.renaming.set(null); }

  protected resetBindings() { this.kb.recordingAction.set(null); this.kb.applyPreset('default'); }

  protected loserNames(actions: string[]) { return actions.map(a => this.labels[a]).join(' and '); }

  protected keyLabel(action: string) {
    const winner = this.clashes().get(action);
    const base = `${this.labels[action]}: ${formatKey(this.kb.bindings()[action])}`;
    return winner ? `${base}, conflicts with ${this.labels[winner]}` : base;
  }
}
