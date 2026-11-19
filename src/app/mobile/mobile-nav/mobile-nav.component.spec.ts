import { TestBed } from '@angular/core/testing';
import { MobileNavComponent } from './mobile-nav.component';
import { ReaderService } from '../../services/reader.service';

describe('MobileNavComponent', () => {
  beforeEach(() => localStorage.clear());

  async function render(totalPages: number | null, page = 1, chapter = 1) {
    const reader = TestBed.inject(ReaderService);
    reader.manga.set('iron_orchard'); reader.chapter.set(chapter); reader.page.set(page); reader.totalPages.set(totalPages);
    const fixture = TestBed.createComponent(MobileNavComponent);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  // Regression: an unknown chapter length showed a row of vermilion dashes and a bare "01".
  it('shows a plain track and "01 / ?" while the chapter length is unknown', async () => {
    const el = await render(null);
    expect(el.querySelector('[data-track="unknown"]')).not.toBeNull();
    expect(el.textContent!.replace(/\s+/g, ' ')).toContain('01 / ?');
  });

  it('shows ticks and the total once the length is known', async () => {
    const el = await render(19, 7);
    expect(el.querySelector('[data-track="unknown"]')).toBeNull();
    expect(el.textContent!.replace(/\s+/g, ' ')).toContain('07 / 19');
  });

  it('labels the last-page roll button apart from the next-chapter button', async () => {
    const text = (await render(19, 19, 214)).textContent!.replace(/\s+/g, ' ');
    expect(text).toContain('Next ch');
    expect(text.match(/CH 215/g)?.length).toBe(1);
  });

  it('names the disabled previous-chapter button in chapter 1', async () => {
    expect((await render(19, 1, 1)).textContent).toContain('First ch');
  });
});
