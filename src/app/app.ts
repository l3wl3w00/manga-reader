import { Component, inject, signal, computed, viewChild, HostListener, OnInit } from '@angular/core';
import { ReaderService } from './services/reader.service';
import { LibraryService } from './services/library.service';
import { ZoomService, PAN_STEP, ZOOM_STEP } from './services/zoom.service';
import { KeybindingsService } from './services/keybindings.service';
import { ReaderComponent } from './components/reader/reader.component';
import { ControlPanelComponent } from './components/control-panel/control-panel.component';
import { LibraryPanelComponent } from './components/library-panel/library-panel.component';
import { BottomBarComponent } from './components/bottom-bar/bottom-bar.component';
import { SettingsModalComponent } from './components/settings-modal/settings-modal.component';

@Component({
  selector: 'app-root',
  imports: [
    ReaderComponent,
    ControlPanelComponent,
    LibraryPanelComponent,
    BottomBarComponent,
    SettingsModalComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  reader = inject(ReaderService);
  lib    = inject(LibraryService);
  zoom   = inject(ZoomService);
  kb     = inject(KeybindingsService);

  settingsModal = viewChild.required(SettingsModalComponent);

  panelsLocked = signal(true);
  peeking      = signal(false);

  showPanels = computed(() => this.panelsLocked() || this.peeking() || this.settingsModal().isOpen());

  progress = computed(() => {
    const tp = this.reader.totalPages();
    return tp ? (this.reader.page() / tp) * 100 : 0;
  });

  showProgress = computed(() => !!this.reader.totalPages() && !!this.reader.manga());

  ngOnInit() {
    const last = this.lib.getLast();
    if (last?.slug) {
      this.reader.load(last.slug, last.chapter ?? 1, last.page ?? 1);
    }
  }

  openSettings() { this.settingsModal().open(); }

  togglePanels() { this.panelsLocked.update(v => !v); }

  onZoneCenterClick() { this.togglePanels(); }

  onZoneLeft()  { this.reader.prevPage(); }
  onZoneRight() { this.reader.nextPage(); }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    const modal = this.settingsModal();
    if (modal.isOpen()) {
      modal.onKeyDown(e);
      return;
    }

    const recording = this.kb.recordingAction();
    if (recording !== null) return;

    if ((e.target as HTMLElement)?.tagName === 'INPUT') {
      if (e.key === 'Escape') (e.target as HTMLElement).blur();
      return;
    }

    if (e.key === 'Escape') { modal.close(); return; }

    if (this.kb.matches(e, 'fullscreen')) {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
      return;
    }
    if (this.kb.matches(e, 'jumpVert')) {
      e.preventDefault();
      if (this.reader.manga()) {
        const minY = window.innerHeight * (1 - this.zoom.zoom());
        const py = this.zoom.panY();
        this.zoom.panY.set(py > minY / 2 ? minY : 0);
        this.zoom.clampPan();
      }
      return;
    }
    if (this.kb.matches(e, 'togglePanels')) { e.preventDefault(); this.togglePanels(); return; }
    if (this.kb.matches(e, 'peekPanels'))  { e.preventDefault(); if (!this.peeking()) this.peeking.set(true); return; }
    if (this.kb.matches(e, 'nextPage'))    { e.preventDefault(); this.reader.nextPageFull(); return; }
    if (this.kb.matches(e, 'prevPage'))    { e.preventDefault(); this.reader.prevPageFull(); return; }
    if (this.kb.matches(e, 'zoomIn'))      { e.preventDefault(); this.zoom.setZoom(this.zoom.zoom() + ZOOM_STEP); return; }
    if (this.kb.matches(e, 'zoomOut'))     { e.preventDefault(); this.zoom.setZoom(this.zoom.zoom() - ZOOM_STEP); return; }
    if (this.kb.matches(e, 'panRight'))    { e.preventDefault(); this.zoom.panX.update(v => v - PAN_STEP); this.zoom.clampPan(); return; }
    if (this.kb.matches(e, 'panLeft'))     { e.preventDefault(); this.zoom.panX.update(v => v + PAN_STEP); this.zoom.clampPan(); return; }
    if (this.kb.matches(e, 'panDown'))     { e.preventDefault(); this.zoom.panY.update(v => v - PAN_STEP); this.zoom.clampPan(); return; }
    if (this.kb.matches(e, 'panUp'))       { e.preventDefault(); this.zoom.panY.update(v => v + PAN_STEP); this.zoom.clampPan(); return; }
  }

  @HostListener('document:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent) {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    if (this.kb.matches(e, 'peekPanels')) this.peeking.set(false);
  }
}
