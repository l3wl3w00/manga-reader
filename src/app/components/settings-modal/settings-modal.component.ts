import { Component, inject, signal } from '@angular/core';
import { KeybindingsService, PRESETS, ACTION_GROUPS, ACTION_LABELS, Binding } from '../../services/keybindings.service';
import { ZoomService } from '../../services/zoom.service';

@Component({
  selector: 'app-settings-modal',
  imports: [],
  templateUrl: './settings-modal.component.html',
})
export class SettingsModalComponent {
  kb   = inject(KeybindingsService);
  zoom = inject(ZoomService);

  isOpen    = signal(false);
  activeTab = signal<'kb' | 'zoom'>('kb');
  renamingPreset = signal<string | null>(null);
  renameValue    = signal('');

  fitHeightValue   = signal(this.zoom.fitSettings().heightPct);
  fitWidthValue    = signal(this.zoom.fitSettings().maxWidthPct);

  PRESETS       = PRESETS;
  ACTION_GROUPS = ACTION_GROUPS;
  ACTION_LABELS = ACTION_LABELS;

  open()  { this.isOpen.set(true); }
  close() {
    this.kb.recordingAction.set(null);
    this.renamingPreset.set(null);
    this.isOpen.set(false);
  }

  startRename(presetId: string) {
    this.renamingPreset.set(presetId);
    this.renameValue.set(this.kb.getPresetLabel(presetId));
  }

  commitRename(presetId: string) {
    const name = this.renameValue().trim();
    if (name) this.kb.savePresetName(presetId, name);
    this.renamingPreset.set(null);
  }

  cancelRename() { this.renamingPreset.set(null); }

  startRecording(action: string) { this.kb.recordingAction.set(action); }

  onKeyDown(e: KeyboardEvent) {
    const recording = this.kb.recordingAction();
    if (recording !== null) {
      e.preventDefault();
      if (e.key === 'Escape') { this.kb.recordingAction.set(null); return; }
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
      this.kb.setBinding(recording, { key: e.key, ctrl: e.ctrlKey });
      this.kb.recordingAction.set(null);
      return;
    }
    if (e.key === 'Escape') this.close();
  }

  onFitChange() {
    const h = Math.min(100, Math.max(10, this.fitHeightValue() || 60));
    const w = Math.max(10, this.fitWidthValue() || 90);
    this.fitHeightValue.set(h);
    this.fitWidthValue.set(w);
    this.zoom.updateFitSettings(h, w);
  }

  resetBindings() {
    this.kb.applyPreset('default');
    this.kb.recordingAction.set(null);
  }

  presetLabel(id: string) { return this.kb.getPresetLabel(id); }
  formatKey(b: Binding | undefined) { return this.kb.formatKey(b); }
  bindings() { return this.kb.bindings(); }
}
