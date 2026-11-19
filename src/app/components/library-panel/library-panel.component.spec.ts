import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LibraryPanelComponent } from './library-panel.component';

describe('LibraryPanelComponent remove confirm', () => {
  afterEach(() => { delete (Element.prototype as Partial<Element>).scrollIntoView; });

  // Regression: on a short window the confirm opened below the fold with its buttons cut off.
  it('scrolls the confirm into view when it opens', async () => {
    localStorage.setItem('manga-reader-library', JSON.stringify({
      a_title: { slug: 'a_title', chapters: { 1: 2 }, lastChapter: 1, lastPage: 2 },
    }));
    const scrolled: Element[] = [];
    const spy = vi.fn(function (this: Element) { scrolled.push(this); });
    Element.prototype.scrollIntoView = spy;
    const fixture = TestBed.createComponent(LibraryPanelComponent);
    await fixture.whenStable();
    (fixture.nativeElement.querySelector('button[aria-label="Remove A Title"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ block: 'nearest' }));
    expect(scrolled[0].getAttribute('role')).toBe('alertdialog');
  });
});

describe('Rail panels', () => {
  // The owner's call: the rail's panels can't be minimised.
  it('have no collapse buttons', async () => {
    const { ControlPanelComponent } = await import('../control-panel/control-panel.component');
    for (const cmp of [LibraryPanelComponent, ControlPanelComponent] as Type<unknown>[]) {
      const fixture = TestBed.createComponent(cmp);
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('[aria-expanded], [aria-label*="ollapse"], [aria-label*="xpand"]')).toBeNull();
    }
  });
});
