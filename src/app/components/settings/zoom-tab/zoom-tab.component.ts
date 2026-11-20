import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ZoomService } from '../../../services/zoom.service';
import { KeybindingsService } from '../../../services/keybindings.service';
import { LayoutService } from '../../../services/layout.service';
import { TYPICAL_PAGE, containRect } from '../../../services/zoom-math';
import { PageArtComponent } from '../../../ui/page-art/page-art.component';
import { ICONS } from '../../../ui/icons';

export const HEIGHT_RANGE = { min: 10, max: 100 } as const;
export const WIDTH_RANGE = { min: 10, max: 200 } as const;
const STEP = 5;

/** Auto-fit settings with a live preview of how a page opens in this window. */
@Component({
  selector: 'app-zoom-tab',
  imports: [LucideAngularModule, NgTemplateOutlet, PageArtComponent],
  host: { class: 'block', '(window:resize)': 'viewport.set({ w: $any($event.target).innerWidth, h: $any($event.target).innerHeight })' },
  templateUrl: './zoom-tab.component.html',
})
export class ZoomTabComponent {
  protected zoom = inject(ZoomService);
  protected kb = inject(KeybindingsService);
  protected layout = inject(LayoutService);
  protected readonly icons = ICONS;

  protected readonly Math = Math;

  /** Desktop sliders. */
  protected readonly fields = computed(() => {
    const fs = this.zoom.fitSettings();
    return [
      { which: 'h' as const, label: 'height', title: 'Height %', value: fs.heightPct, range: HEIGHT_RANGE,
        help: "How much of the page's height is on screen at once. 10 to 100." },
      { which: 'w' as const, label: 'width', title: 'Max width %', value: fs.maxWidthPct, range: WIDTH_RANGE,
        help: 'The page never grows wider than this share of the window. 10 to 200.' },
    ];
  });

  protected readonly viewport = signal({ w: window.innerWidth, h: window.innerHeight });

  /** The preview frame is this window, scaled down. */
  protected readonly preview = computed(() => {
    const vp = this.viewport(), fs = this.zoom.fitSettings();
    const img = this.zoom.imageSize() ?? TYPICAL_PAGE;
    // The same framing a page turn gets: the width is also capped so the neighbour strips stay in view.
    const view = { zoom: this.zoom.fitZoomFor(img) };
    const r = containRect(vp, img, this.zoom.inset());
    const frameW = this.layout.mobile() ? 150 : 400;
    const s = frameW / vp.w;
    const pageW = r.w * view.zoom * s;
    const byWidth = view.zoom < vp.h / ((fs.heightPct / 100) * r.h) - 0.001;
    return {
      frameW, frameH: Math.round(vp.h * s),
      pageW, pageH: r.h * view.zoom * s, pageLeft: (frameW - pageW) / 2,
      percent: Math.round(view.zoom * 100),
      widePct: Math.round((Math.min(pageW, frameW) / frameW) * 100),
      byWidth,
    };
  });

  protected set(which: 'h' | 'w', value: number) {
    const fs = this.zoom.fitSettings();
    const range = which === 'h' ? HEIGHT_RANGE : WIDTH_RANGE;
    const v = Math.min(range.max, Math.max(range.min, Math.round(value) || range.min));
    if (which === 'h') this.zoom.updateFitSettings(v, fs.maxWidthPct);
    else this.zoom.updateFitSettings(fs.heightPct, v);
  }

  protected step(which: 'h' | 'w', dir: 1 | -1) {
    const fs = this.zoom.fitSettings();
    this.set(which, (which === 'h' ? fs.heightPct : fs.maxWidthPct) + dir * STEP);
  }

  protected fill(value: number, range: { min: number; max: number }) {
    return `${((value - range.min) / (range.max - range.min)) * 100}%`;
  }
}
