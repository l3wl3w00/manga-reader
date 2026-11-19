import { Injectable, computed, inject, signal } from '@angular/core';
import { ReaderService } from './reader.service';

export type Sheet = 'jump' | 'library' | null;

export const PAN_HINT_STORAGE = 'manga-reader-pan-hint-dismissed';

function readFlag(key: string): boolean {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
}

/** Visibility of the reading chrome: panels (lock / peek), settings and mobile sheets. */
@Injectable({ providedIn: 'root' })
export class UiService {
  private reader = inject(ReaderService);

  readonly panelsLocked = signal(true);
  readonly peeking      = signal(false);
  readonly settingsOpen = signal(false);
  readonly sheet        = signal<Sheet>(null);
  /** The "drag to pan" hint shown while zoomed, once closed, stays closed. */
  readonly panHintDismissed = signal(readFlag(PAN_HINT_STORAGE));

  /** Nothing to read yet: the controls are the whole point, so they stay. */
  private readonly needsControls = computed(() => {
    const s = this.reader.screen();
    return s === 'welcome' || s === 'not-found';
  });

  readonly showPanels = computed(() =>
    this.panelsLocked() || this.peeking() || this.settingsOpen() || this.needsControls());
  /** Shown only because Tab / long-press is held. */
  readonly peekOnly = computed(() => this.peeking() && !this.panelsLocked() && !this.needsControls());

  togglePanels() { this.panelsLocked.update(v => !v); }
  openSettings() { this.sheet.set(null); this.settingsOpen.set(true); }
  closeSettings() { this.settingsOpen.set(false); }
  openSheet(sheet: Sheet) { this.sheet.set(sheet); }
  closeSheet() { this.sheet.set(null); }
  dismissPanHint() {
    this.panHintDismissed.set(true);
    try { localStorage.setItem(PAN_HINT_STORAGE, '1'); } catch { /* private mode: closed for this visit only */ }
  }
}
