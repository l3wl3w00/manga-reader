import { TestBed } from '@angular/core/testing';
import { NotFoundComponent } from './not-found.component';
import { ReaderService } from '../../services/reader.service';
import { SourceService } from '../../services/source.service';

describe('NotFoundComponent', () => {
  beforeEach(() => localStorage.clear());

  it('searches with the search template, and hides the button when it is empty', async () => {
    const reader = TestBed.inject(ReaderService);
    reader.missed.set({ manga: 'crimson_tide_ronnin', chapter: 214, page: 1 });
    reader.screen.set('not-found');
    const source = TestBed.inject(SourceService);
    source.edit('search', 'https://cdn.example.org/find?q={query}'); source.commit('search');
    const fixture = TestBed.createComponent(NotFoundComponent);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const search = () => [...el.querySelectorAll('button')].find(b => b.textContent!.includes('Search on'));
    expect(search()!.textContent!.trim()).toBe('Search on cdn.example.org');
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    search()!.click();
    expect(open).toHaveBeenCalledWith('https://cdn.example.org/find?q=crimson%20tide%20ronnin', '_blank', 'noopener');
    open.mockRestore();

    source.edit('search', ''); source.commit('search');
    await fixture.whenStable();
    expect(search()).toBeUndefined();
    expect(el.textContent).toContain('Try again');
  });

  it('points at Settings › Source when the page template is a custom one', async () => {
    TestBed.inject(ReaderService).missed.set({ manga: 'x', chapter: 1, page: 1 });
    const source = TestBed.inject(SourceService);
    const fixture = TestBed.createComponent(NotFoundComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('Settings › Source');
    source.edit('image', 'https://cdn.example.org/{manga}/{ch}/{pg}.jpg'); source.commit('image');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Settings › Source');
  });
});
