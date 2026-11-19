import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, linkedSignal, viewChild } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { UiService } from '../../services/ui.service';
import { LayoutService } from '../../services/layout.service';
import { KeybindingsService } from '../../services/keybindings.service';
import { ICONS } from '../../ui/icons';
import { focusables, wrapTarget } from '../../ui/focus-trap';
import { KeybindingsTabComponent } from './keybindings-tab/keybindings-tab.component';
import { ZoomTabComponent } from './zoom-tab/zoom-tab.component';
import { GesturesTabComponent } from './gestures-tab/gestures-tab.component';
import { MotionTabComponent } from './motion-tab/motion-tab.component';

type Tab = 'keys' | 'zoom' | 'motion' | 'gestures';
const TAB_LABELS: Record<Tab, string> = { keys: 'Keybindings', zoom: 'Zoom', motion: 'Motion', gestures: 'Gestures' };

/** Settings: a dialog on desktop (Keybindings, Zoom), full screen on mobile (Gestures, Zoom, and
 *  Keybindings when a keyboard is around). */
@Component({
  selector: 'app-settings',
  imports: [LucideAngularModule, KeybindingsTabComponent, ZoomTabComponent, MotionTabComponent, GesturesTabComponent],
  host: { class: 'fixed inset-0 z-[100]', 'animate.leave': 'x-leave', '(keydown.tab)': 'trapTab($event)', '(keydown.shift.tab)': 'trapTab($event)' },
  template: `
    @let mobile = layout.mobile();
    @if (!mobile) {
      <div class="absolute inset-0 bg-ink/80" animate.enter="a-fade-in" data-leave="fade" (click)="ui.closeSettings()"></div>
    }
    <section #dialog role="dialog" aria-modal="true" aria-label="Settings" tabindex="-1"
      [class]="mobile
        ? 'absolute inset-0 flex flex-col bg-surface-1 pt-[env(safe-area-inset-top)]'
        : 'pnl absolute left-1/2 top-1/2 max-h-[calc(100dvh-48px)] w-[min(880px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2 shadow-hard-lg'"
      [animate.enter]="mobile ? 'a-corner-in' : 'a-modal-in'" [attr.data-leave]="mobile ? 'corner' : 'modal'">
      @if (mobile) {
        <header class="flex h-15 shrink-0 items-center pl-5 pr-1.5">
          <h1 class="dsp mr-auto text-xl">Settings</h1>
          <button class="ib ib-lg text-paper" (click)="ui.closeSettings()" aria-label="Close settings"><lucide-icon [img]="icons.x" [size]="20" /></button>
        </header>
      }
      <div class="flex shrink-0 items-end border-b-2 border-paper" [class]="mobile ? 'px-2' : 'h-14 pl-1.5 pr-2.5'">
        <div class="mr-auto flex self-stretch items-end" role="tablist">
          @for (t of tabs(); track t) {
            <button class="tab" [class]="mobile ? 'h-12' : 'h-[54px]'" role="tab" [attr.aria-selected]="active() === t"
              (click)="active.set(t)">{{ labels[t] }}</button>
          }
        </div>
        @if (!mobile) {
          <button class="ib size-10 self-center" (click)="ui.closeSettings()" aria-label="Close settings"><lucide-icon [img]="icons.x" [size]="20" /></button>
        }
      </div>
      <div class="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain" role="tabpanel" [attr.aria-label]="labels[active()]">
        @switch (active()) {
          @case ('keys') { <app-keybindings-tab class="a-fade-in" /> }
          @case ('zoom') { <app-zoom-tab class="a-fade-in" /> }
          @case ('motion') { <app-motion-tab class="a-fade-in" /> }
          @case ('gestures') { <app-gestures-tab class="a-fade-in" /> }
        }
      </div>
    </section>
  `,
})
export class SettingsComponent {
  protected ui = inject(UiService);
  protected layout = inject(LayoutService);
  private kb = inject(KeybindingsService);
  protected readonly icons = ICONS;
  protected readonly labels = TAB_LABELS;

  protected readonly tabs = computed<Tab[]>(() =>
    this.layout.mobile()
      ? ['gestures', 'zoom', 'motion', ...(this.layout.finePointer() ? ['keys' as const] : [])]
      : ['keys', 'zoom', 'motion']);
  protected readonly active = linkedSignal<Tab[], Tab>({
    source: this.tabs,
    computation: (tabs, prev) => (prev && tabs.includes(prev.value) ? prev.value : tabs[0]),
  });

  private readonly dialog = viewChild.required<ElementRef<HTMLElement>>('dialog');

  constructor() {
    // Modal (the layouts make the app behind inert): focus starts on the active tab and goes back to the
    // opener on close.
    const opener = document.activeElement as HTMLElement | null;
    afterNextRender(() => {
      const dialog = this.dialog().nativeElement;
      (dialog.querySelector<HTMLElement>('[role=tab][aria-selected=true]') ?? dialog).focus();
    });
    inject(DestroyRef).onDestroy(() => {
      // Never leave a recording running in a closed dialog.
      this.kb.recordingAction.set(null);
      if (opener?.isConnected) opener.focus();
    });
  }

  /** Tab and Shift+Tab wrap inside the dialog. */
  protected trapTab(e: Event) {
    const k = e as KeyboardEvent;
    const target = wrapTarget(focusables(this.dialog().nativeElement), document.activeElement, k.shiftKey);
    if (target) { k.preventDefault(); target.focus(); }
  }
}
