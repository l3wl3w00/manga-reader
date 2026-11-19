import { Component, computed, inject } from '@angular/core';
import { ReaderService } from '../../services/reader.service';
import { UiService } from '../../services/ui.service';
import { ReaderComponent } from '../../components/reader/reader.component';
import { ClickZonesComponent } from '../../components/click-zones/click-zones.component';
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

/** Desktop: page with click zones, left rail (controls + library), bottom bar, settings dialog. */
@Component({
  selector: 'app-desktop-layout',
  imports: [
    ReaderComponent, ClickZonesComponent, WelcomeComponent, NotFoundComponent, LoadingCardComponent,
    EndOfChapterComponent, HudComponent, ControlPanelComponent, LibraryPanelComponent, BottomBarComponent, SettingsComponent, ZoomChipComponent,
  ],
  host: { class: 'contents' },
  template: `
    @let screen = reader.screen();
    @let shown = ui.showPanels();
    <!-- Everything but Settings: inert while the Settings dialog is open. -->
    <div class="contents" [inert]="ui.settingsOpen()">
    <app-reader />
    @if (reading()) { <app-click-zones /> }

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
      <div class="slide-up pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center max-xl:pl-[384px] max-xl:pr-6"
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

  protected readonly reading = computed(() => {
    const s = this.reader.screen();
    return s === 'image' || s === 'loading' || s === 'end';
  });
}
