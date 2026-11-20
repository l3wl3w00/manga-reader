import { Component, inject } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { ReaderService } from '../../services/reader.service';
import { UiService } from '../../services/ui.service';
import { ICONS } from '../../ui/icons';
import { SheetComponent } from '../../ui/sheet/sheet.component';
import { ReaderComponent } from '../../components/reader/reader.component';
import { WelcomeComponent } from '../../components/welcome/welcome.component';
import { NotFoundComponent } from '../../components/not-found/not-found.component';
import { LoadingCardComponent } from '../../components/loading-card/loading-card.component';
import { EndOfChapterComponent } from '../../components/end-of-chapter/end-of-chapter.component';
import { HudComponent } from '../../components/hud/hud.component';
import { JumpFormComponent } from '../../components/jump-form/jump-form.component';
import { SettingsComponent } from '../../components/settings/settings.component';
import { MobileHeaderComponent } from '../../mobile/mobile-header/mobile-header.component';
import { MobileTopBarComponent } from '../../mobile/mobile-top-bar/mobile-top-bar.component';
import { MobileNavComponent } from '../../mobile/mobile-nav/mobile-nav.component';
import { GestureLayerComponent } from '../../mobile/gesture-layer/gesture-layer.component';
import { LibrarySheetComponent } from '../../mobile/library-sheet/library-sheet.component';
import { SwipeCueComponent } from '../../mobile/swipe-cue/swipe-cue.component';

/** Mobile (narrow or touch): the page strip with its neighbours as slivers, gestures (swipe to turn), top and bottom bars, bottom sheets,
 *  full-screen settings. */
@Component({
  selector: 'app-mobile-layout',
  imports: [
    LucideDynamicIcon, SheetComponent, ReaderComponent, WelcomeComponent, NotFoundComponent, LoadingCardComponent,
    EndOfChapterComponent, HudComponent, JumpFormComponent, SettingsComponent, MobileHeaderComponent,
    MobileTopBarComponent, MobileNavComponent, GestureLayerComponent, LibrarySheetComponent, SwipeCueComponent,
  ],
  host: { class: 'contents' },
  template: `
    @let shown = ui.showPanels();
    <!-- Everything but Settings: inert while Settings is open. -->
    <div class="contents" [inert]="ui.settingsOpen()">
    @switch (reader.screen()) {
      @case ('welcome') {
        <div class="fixed inset-0 flex flex-col" animate.enter="a-fade-in" animate.leave="a-fade-out">
          <app-mobile-header />
          <app-welcome class="min-h-0 flex-1" />
          <app-jump-form variant="welcome" class="shrink-0 border-t-2 border-paper bg-surface-1 p-5 pb-[max(20px,env(safe-area-inset-bottom))]" />
        </div>
      }
      @case ('not-found') {
        <div class="fixed inset-0 flex flex-col" animate.enter="a-screen-in" animate.leave="a-fade-out">
          <app-mobile-header />
          <app-not-found class="min-h-0 flex-1 overflow-y-auto" />
        </div>
      }
      @default {
        <app-reader />
        <app-gesture-layer />
        <app-swipe-cue />
        @if (reader.screen() === 'loading') { <app-loading-card animate.enter="a-pop-in" animate.leave="a-fade-out" /> }
        @if (reader.screen() === 'end') { <app-end-of-chapter /> }
        <app-hud />
        <app-mobile-top-bar class="vt-top slide-down fixed inset-x-0 top-0 z-50" [attr.data-shown]="shown" [inert]="!shown" />
        <app-mobile-nav class="vt-nav slide-up fixed inset-x-0 bottom-0 z-50" [attr.data-shown]="shown" [inert]="!shown" />
      }
    }

    @if (ui.sheet() === 'jump') {
      <app-sheet label="Jump to" (closed)="ui.closeSheet()">
        <div sheetHeader class="flex items-center border-b-2 border-line pt-1 pb-2.5 pl-5 pr-2">
          <h1 class="dsp mr-auto text-xl">Jump to</h1>
          <button class="ib ib-lg text-paper" (click)="ui.closeSheet()" aria-label="Close"><svg [lucideIcon]="icons.x" [size]="20" /></button>
        </div>
        <app-jump-form variant="sheet" class="scroll-thin overflow-y-auto px-5 pt-[18px] pb-[26px]" (submitted)="ui.closeSheet()" />
      </app-sheet>
    }
    @if (ui.sheet() === 'library') { <app-library-sheet /> }
    </div>
    @if (ui.settingsOpen()) { <app-settings /> }
  `,
})
export class MobileLayoutComponent {
  protected reader = inject(ReaderService);
  protected ui = inject(UiService);
  protected readonly icons = ICONS;
}
