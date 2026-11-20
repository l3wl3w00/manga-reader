import { Component, computed, inject } from '@angular/core';
import { ReaderService } from '../../services/reader.service';
import { UiService } from '../../services/ui.service';
import { ZoomService } from '../../services/zoom.service';
import { LayoutService } from '../../services/layout.service';
import { RAIL_EDGE } from '../../strip/strip';
import { ReaderComponent } from '../../components/reader/reader.component';
import { WelcomeComponent } from '../../components/welcome/welcome.component';
import { NotFoundComponent } from '../../components/not-found/not-found.component';
import { LoadingCardComponent } from '../../components/loading-card/loading-card.component';
import { EndOfChapterComponent } from '../../components/end-of-chapter/end-of-chapter.component';
import { HudComponent } from '../../components/hud/hud.component';
import { ControlPanelComponent } from '../../components/control-panel/control-panel.component';
import { LibraryPanelComponent } from '../../components/library-panel/library-panel.component';
import { BottomBarComponent } from '../../components/bottom-bar/bottom-bar.component';
import { SettingsComponent } from '../../components/settings/settings.component';
import { ZoomChipComponent } from '../../components/zoom-chip/zoom-chip.component';

/** Desktop: the page strip (click a neighbour to turn), left rail (controls + library), bottom bar, settings dialog. */
@Component({
  selector: 'app-desktop-layout',
  imports: [
    ReaderComponent, WelcomeComponent, NotFoundComponent, LoadingCardComponent,
    EndOfChapterComponent, HudComponent, ControlPanelComponent, LibraryPanelComponent, BottomBarComponent, SettingsComponent, ZoomChipComponent,
  ],
  host: { class: 'contents' },
  template: `
    @let screen = reader.screen();
    @let shown = ui.showPanels();
    <!-- Everything but Settings: inert while the Settings dialog is open. -->
    <div class="contents" [inert]="ui.settingsOpen()">
    <app-reader />

    @switch (screen) {
      @case ('welcome') { <app-welcome class="stage" animate.enter="a-screen-in" animate.leave="a-fade-out" /> }
      @case ('not-found') { <app-not-found class="stage" animate.enter="a-screen-in" animate.leave="a-fade-out" /> }
      @case ('loading') { <app-loading-card animate.enter="a-pop-in" animate.leave="a-fade-out" /> }
      @case ('end') { <app-end-of-chapter /> }
    }

    <app-hud />

    <div class="vt-rail slide-x fixed bottom-6 left-6 top-6 z-50 flex w-[336px] flex-col gap-4"
      [attr.data-shown]="shown" [inert]="!shown">
      <app-control-panel />
      <app-library-panel />
      @if (reading()) { <app-zoom-chip class="shrink-0 self-start xl:hidden" /> }
    </div>

    @if (reading()) {
      <!-- Centred under the page (its frame, when zoomed), kept clear of the rail and the window edge. -->
      <div class="slide-up pointer-events-none fixed bottom-6 z-50 -translate-x-1/2" [style.left.px]="barX()"
        [attr.data-shown]="shown" [inert]="!shown" animate.enter="a-rise-in">
        <app-bottom-bar class="vt-bar pointer-events-auto w-[552px] max-xl:w-auto" />
      </div>
    }
    </div>

    @if (ui.settingsOpen()) { <app-settings /> }
  `,
  styles: `
    .stage { position: fixed; inset: 0 24px 0 clamp(392px, 30.5vw, 440px); z-index: 20; overflow-y: auto; padding-block: 24px; }
  `,
})
export class DesktopLayoutComponent {
  protected reader = inject(ReaderService);
  protected ui = inject(UiService);
  protected zoom = inject(ZoomService);
  private layout = inject(LayoutService);

  /** Centre of the bottom bar: under the page, but never over the rail (it is up whenever the bar is) and never
   *  past the window's right edge. The bar is 552px wide from xl, about 320px below. */
  protected readonly barX = computed(() => {
    const f = this.zoom.frame(), vw = this.layout.viewport().w;
    const half = (vw >= 1280 ? 552 : 320) / 2;
    const centre = f.x + f.w / 2 + this.zoom.railOffset();
    return Math.min(vw - 24 - half, Math.max(RAIL_EDGE + half, centre));
  });

  protected readonly reading = computed(() => {
    const s = this.reader.screen();
    return s === 'image' || s === 'loading' || s === 'end';
  });
}
