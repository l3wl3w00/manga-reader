import { Component, OnInit, inject } from '@angular/core';
import { LucideIconConfig } from 'lucide-angular';
import { ReaderService } from './services/reader.service';
import { LibraryService } from './services/library.service';
import { ZoomService, PAN_STEP, ZOOM_STEP } from './services/zoom.service';
import { KeybindingsService } from './services/keybindings.service';
import { LayoutService } from './services/layout.service';
import { MotionService } from './services/motion.service';
import { UiService } from './services/ui.service';
import { DesktopLayoutComponent } from './layouts/desktop-layout/desktop-layout.component';
import { MobileLayoutComponent } from './layouts/mobile-layout/mobile-layout.component';
import { BackdropComponent } from './ui/backdrop/backdrop.component';

const isTyping = (e: Event) => {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
};

/** Root: the backdrop, the desktop or mobile layout, resuming the last read page, and the keyboard. */
@Component({
  selector: 'app-root',
  imports: [DesktopLayoutComponent, MobileLayoutComponent, BackdropComponent],
  host: {
    '(document:keydown)': 'onKeyDown($event)',
    '(document:keyup)': 'onKeyUp($event)',
  },
  template: `
    <app-backdrop class="fixed inset-0" />
    @if (layout.mobile()) { <app-mobile-layout /> } @else { <app-desktop-layout /> }
  `,
})
export class App implements OnInit {
  private reader = inject(ReaderService);
  private lib    = inject(LibraryService);
  private zoom   = inject(ZoomService);
  private kb     = inject(KeybindingsService);
  private ui     = inject(UiService);
  protected layout = inject(LayoutService);
  /** Created at start-up so data-motion is on <html> before anything animates. */
  private motion = inject(MotionService);

  constructor() {
    const icons = inject(LucideIconConfig);
    icons.size = 18;
    icons.strokeWidth = 2;
  }

  ngOnInit() {
    const last = this.lib.getLast();
    if (last?.slug) this.reader.load(last.slug, last.chapter ?? 1, last.page ?? 1);
  }

  protected onKeyDown(e: KeyboardEvent) {
    if (this.ui.settingsOpen()) {
      if (this.kb.recordKey(e)) return;
      if (e.key === 'Escape' && !isTyping(e)) this.ui.closeSettings();
      return;
    }
    if (isTyping(e)) {
      if (e.key === 'Escape') (e.target as HTMLElement).blur();
      return;
    }
    if (e.key === 'Escape') {
      if (this.ui.sheet()) this.ui.closeSheet();
      else if (this.reader.screen() === 'end') this.reader.backFromEnd();
      return;
    }

    const action = this.kb.actionFor(e);
    if (!action) return;
    if (action !== 'fullscreen') e.preventDefault();
    switch (action) {
      case 'fullscreen':
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen();
        break;
      case 'jumpVert':     if (this.reader.manga()) this.zoom.jumpVertical(); break;
      case 'togglePanels': this.ui.togglePanels(); break;
      case 'peekPanels':   this.ui.peeking.set(true); break;
      case 'nextPage':     this.reader.nextPageFull(); break;
      case 'prevPage':     this.reader.prevPageFull(); break;
      case 'zoomIn':       this.zoom.setZoom(this.zoom.zoom() + ZOOM_STEP); break;
      case 'zoomOut':      this.zoom.setZoom(this.zoom.zoom() - ZOOM_STEP); break;
      case 'panRight':     this.zoom.panBy(-PAN_STEP, 0); break;
      case 'panLeft':      this.zoom.panBy(PAN_STEP, 0); break;
      case 'panDown':      this.zoom.panBy(0, -PAN_STEP); break;
      case 'panUp':        this.zoom.panBy(0, PAN_STEP); break;
    }
  }

  protected onKeyUp(e: KeyboardEvent) {
    if (isTyping(e)) return;
    if (this.kb.matches(e, 'peekPanels')) this.ui.peeking.set(false);
  }
}
