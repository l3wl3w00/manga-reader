import { TestBed } from '@angular/core/testing';
import { JumpFormComponent, normManga } from './jump-form.component';
import { ReaderService } from '../../services/reader.service';
import { SourceService } from '../../services/source.service';

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

  it('turns typed names into slugs', () => {
    expect(normManga('  Paper Moon  Courier ')).toBe('paper_moon_courier');
  });
});

describe('JumpFormComponent links', () => {
  beforeEach(() => localStorage.clear());

  async function render(variant: 'panel' | 'sheet') {
    const reader = TestBed.inject(ReaderService);
    reader.manga.set('crimson_tide_ronin'); reader.chapter.set(214); reader.page.set(7);
    reader.lastGood.set({ manga: 'crimson_tide_ronin', chapter: 214, page: 7 });
    const fixture = TestBed.createComponent(JumpFormComponent);
    fixture.componentRef.setInput('variant', variant);
    await fixture.whenStable();
    return fixture;
  }
  const labels = (el: HTMLElement) => [...el.querySelectorAll('button')].map(b => b.getAttribute('aria-label') ?? b.textContent!.trim());

  it('opens the search and chapter links from the templates', async () => {
    const source = TestBed.inject(SourceService);
    source.edit('chapter', 'https://reader.example.org/{manga}/{ch}'); source.commit('chapter');
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const fixture = await render('panel');
    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLButtonElement>('button[aria-label="Search on MangaFreak"]')!.click();
    el.querySelector<HTMLButtonElement>('button[aria-label="Open chapter on reader.example.org"]')!.click();
    expect(open.mock.calls.map(c => c[0])).toEqual(['https://ww2.mangafreak.me/Find/crimson%20tide%20ronin', 'https://reader.example.org/Crimson_Tide_Ronin/214']);
    open.mockRestore();
  });

  it('hides the search button and the chapter link when their templates are empty', async () => {
    const source = TestBed.inject(SourceService);
    const fixture = await render('sheet');
    const el: HTMLElement = fixture.nativeElement;
    expect(labels(el)).toContain('Search on MangaFreak');
    expect(el.textContent).toContain('Open chapter 214 on MangaFreak');
    source.edit('search', ''); source.commit('search');
    source.edit('chapter', ''); source.commit('chapter');
    await fixture.whenStable();
    expect(labels(el).some(l => l.startsWith('Search on'))).toBe(false);
    expect(el.textContent).not.toContain('Open chapter');

    const panel = (await render('panel')).nativeElement as HTMLElement;
    expect(labels(panel).some(l => l.startsWith('Search on') || l.startsWith('Open chapter'))).toBe(false);
  });
});
