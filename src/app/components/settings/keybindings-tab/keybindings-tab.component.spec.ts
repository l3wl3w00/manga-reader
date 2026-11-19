import { TestBed } from '@angular/core/testing';
import { KeybindingsTabComponent } from './keybindings-tab.component';
import { KeybindingsService } from '../../../services/keybindings.service';

describe('KeybindingsTabComponent reset', () => {
  beforeEach(() => localStorage.clear());

  const resetButton = (el: HTMLElement) =>
    [...el.querySelectorAll('button')].find(b => b.textContent!.includes('Reset to defaults')) as HTMLButtonElement;

  // Regression: Reset looked live while an unedited preset was active, where it does nothing.
  it('is disabled for an unedited preset and enabled once a binding is edited', async () => {
    const fixture = TestBed.createComponent(KeybindingsTabComponent);
    await fixture.whenStable();
    expect(resetButton(fixture.nativeElement).disabled).toBe(true);

    TestBed.inject(KeybindingsService).setBinding('zoomIn', { key: '=', ctrl: true });
    await fixture.whenStable();
    expect(resetButton(fixture.nativeElement).disabled).toBe(false);
  });
});
