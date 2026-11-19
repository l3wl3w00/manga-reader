import { TestBed } from '@angular/core/testing';
import { PAN_HINT_STORAGE, UiService } from './ui.service';

describe('UiService pan hint', () => {
  beforeEach(() => localStorage.clear());

  it('shows the "drag to pan" hint until it is closed', () => {
    expect(TestBed.inject(UiService).panHintDismissed()).toBe(false);
  });

  it('keeps the hint closed after a reload once it was closed', () => {
    TestBed.inject(UiService).dismissPanHint();
    expect(localStorage.getItem(PAN_HINT_STORAGE)).toBe('1');

    TestBed.resetTestingModule();
    expect(TestBed.inject(UiService).panHintDismissed()).toBe(true);
  });
});
