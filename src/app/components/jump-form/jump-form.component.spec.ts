import { TestBed } from '@angular/core/testing';
import { JumpFormComponent, chapterUrl, normManga } from './jump-form.component';
import { ReaderService } from '../../services/reader.service';

describe('JumpFormComponent', () => {
  beforeEach(() => localStorage.clear());

  // Regression: Go used the last typed chapter/page, not where the reader is now.
  it('Go reloads the place being read, not stale typed values', async () => {
    const reader = TestBed.inject(ReaderService);
    const load = vi.spyOn(reader, 'load').mockImplementation(() => true);
    const fixture = TestBed.createComponent(JumpFormComponent);
    await fixture.whenStable();
    reader.manga.set('iron_orchard'); reader.chapter.set(3); reader.page.set(9);
    await fixture.whenStable();
    (fixture.nativeElement.querySelector('.btn-primary') as HTMLButtonElement).click();
    expect(load).toHaveBeenCalledWith('iron_orchard', 3, 9);
  });

  it('turns typed names into slugs and site links', () => {
    expect(normManga('  Paper Moon  Courier ')).toBe('paper_moon_courier');
    expect(chapterUrl('paper_moon_courier', 58)).toBe('https://ww2.mangafreak.me/Read1_Paper_Moon_Courier_58');
  });
});
