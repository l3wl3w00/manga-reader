import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SettingsComponent } from './settings.component';
import { DesktopLayoutComponent } from '../../layouts/desktop-layout/desktop-layout.component';
import { UiService } from '../../services/ui.service';
import { focusables, wrapTarget } from '../../ui/focus-trap';

@Component({
  imports: [SettingsComponent],
  template: `<button id="opener">Settings</button>@if (open()) { <app-settings /> }`,
})
class Host { open = signal(false); }

const tab = (el: Element, shiftKey = false) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true }));

describe('Settings dialog focus', () => {
  beforeEach(() => localStorage.clear());

  // Regression: Tab walked out of the open dialog onto the panels behind the scrim.
  it('starts on the active tab, keeps Tab inside, and gives focus back to the opener', async () => {
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    const opener = fixture.nativeElement.querySelector('#opener') as HTMLButtonElement;
    opener.focus();

    fixture.componentInstance.open.set(true);
    await fixture.whenStable();
    const dialog = fixture.nativeElement.querySelector('[role=dialog]') as HTMLElement;
    expect(document.activeElement?.getAttribute('role')).toBe('tab');
    expect(document.activeElement?.getAttribute('aria-selected')).toBe('true');

    const list = focusables(dialog);
    list[list.length - 1].focus();
    tab(document.activeElement!);
    expect(document.activeElement).toBe(list[0]);
    tab(document.activeElement!, true);
    expect(document.activeElement).toBe(list[list.length - 1]);

    fixture.componentInstance.open.set(false);
    await fixture.whenStable();
    expect(document.activeElement).toBe(opener);
    fixture.nativeElement.remove();
  });

  it('keeps Tab inside on the Source tab too', async () => {
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    fixture.componentInstance.open.set(true);
    await fixture.whenStable();
    const dialog = fixture.nativeElement.querySelector('[role=dialog]') as HTMLElement;
    const tabs = [...dialog.querySelectorAll<HTMLButtonElement>('[role=tab]')];
    expect(tabs.map(t => t.textContent!.trim())).toEqual(['Keybindings', 'Zoom', 'Appearance', 'Source']);
    tabs[3].click();
    await fixture.whenStable();
    expect(dialog.querySelector('#src-image')).toBeTruthy();
    const list = focusables(dialog);
    expect(list).toContain(dialog.querySelector('#src-chapter'));
    list[list.length - 1].focus();
    tab(document.activeElement!);
    expect(document.activeElement).toBe(list[0]);
    tab(document.activeElement!, true);
    expect(document.activeElement).toBe(list[list.length - 1]);
    fixture.nativeElement.remove();
  });

  it('makes the app behind inert while open', async () => {
    const fixture = TestBed.createComponent(DesktopLayoutComponent);
    await fixture.whenStable();
    const shell = fixture.nativeElement.querySelector('div.contents') as HTMLElement & { inert: boolean };
    expect(shell.inert).toBe(false);
    TestBed.inject(UiService).openSettings();
    await fixture.whenStable();
    expect(shell.inert).toBe(true);
  });
});

describe('wrapTarget', () => {
  const [a, b, c] = ['a', 'b', 'c'].map(() => document.createElement('button'));
  it('wraps at both ends and leaves the middle to the browser', () => {
    expect(wrapTarget([a, b, c], c, false)).toBe(a);
    expect(wrapTarget([a, b, c], a, true)).toBe(c);
    expect(wrapTarget([a, b, c], b, false)).toBeNull();
    expect(wrapTarget([a, b, c], document.body, false)).toBe(a);
  });
});
