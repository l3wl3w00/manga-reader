import { Component, computed, effect, inject, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { ReaderService } from '../../services/reader.service';
import { LibraryService } from '../../services/library.service';
import { ZoomService } from '../../services/zoom.service';
import { UiService } from '../../services/ui.service';
import { LayoutService } from '../../services/layout.service';
import { KeybindingsService } from '../../services/keybindings.service';
import { ICONS } from '../../ui/icons';
import { ZoomChipComponent } from '../zoom-chip/zoom-chip.component';
import { MinimapComponent } from '../minimap/minimap.component';
import { TYPICAL_PAGE, containRect } from '../../services/zoom-math';
import { fitCaption, fits, keyHintsWidth } from './gutter-fit';

/** On mobile the zoom chip and minimap fade out this long after the last zoom or pan. */
const MOBILE_ZOOM_UI_MS = 2000;
const pad2 = (n: number) => String(n).padStart(2, '0');

/** Reading overlays: folio, key hints, zoom chip, minimap, zoom hints and the progress rule. */
@Component({
  selector: 'app-hud',
  imports: [LucideDynamicIcon, ZoomChipComponent, MinimapComponent],
  host: { class: 'contents' },
  templateUrl: './hud.component.html',
})
export class HudComponent {
  protected reader = inject(ReaderService);
  protected zoom = inject(ZoomService);
  protected ui = inject(UiService);
  protected layout = inject(LayoutService);
  protected kb = inject(KeybindingsService);
  private lib = inject(LibraryService);
  protected readonly icons = ICONS;

  protected readonly reading = computed(() => {
    const s = this.reader.screen();
    return !!this.reader.lastGood() && (s === 'image' || s === 'loading' || s === 'end');
  });
  protected readonly title = computed(() => this.lib.formatName(this.reader.manga()));
  protected readonly place = computed(() => {
    const tp = this.reader.shownTotal();
    return `${pad2(this.reader.shown().page)}${tp ? ' / ' + tp : ''}`;
  });
  /** Dark space left of the page at 100% with the panels away (desktop). */
  private readonly gutter = computed(() =>
    containRect(this.layout.viewport(), this.zoom.imageSize() ?? TYPICAL_PAGE).x);
  protected readonly caption = computed(() => fitCaption(this.gutter(),
    `${this.title()} · CH ${this.reader.shown().chapter} · ${this.place()}`, `CH ${this.reader.shown().chapter} · ${this.place()}`));
  protected readonly hintsFit = computed(() =>
    fits(keyHintsWidth(this.kb.keyFor('peekPanels'), this.kb.keyFor('togglePanels')), this.gutter()));

  /** Desktop, zoomed: where overlays go to sit 16px inside the current page's frame, in window coordinates. */
  protected readonly inFrame = computed(() => {
    const f = this.zoom.frame(), off = this.zoom.railOffset(), vw = this.layout.viewport().w;
    return { left: f.x + off + 16, right: vw - (f.x + f.w + off) + 16, top: f.y + 16 };
  });

  /** Mobile: the zoom chip and minimap show while zooming, then get out of the way. */
  protected readonly zoomUiAwake = signal(false);

  constructor() {
    effect(onCleanup => {
      this.zoom.activity();
      this.zoomUiAwake.set(true);
      const t = setTimeout(() => this.zoomUiAwake.set(false), MOBILE_ZOOM_UI_MS);
      onCleanup(() => clearTimeout(t));
    });
  }
}
