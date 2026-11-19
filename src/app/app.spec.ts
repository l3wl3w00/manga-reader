import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the welcome screen and an empty shelf on first run', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-control-panel h1')?.textContent).toContain('Manga Reader');
    expect(el.textContent).toContain('Pick up');
    expect(el.textContent).toContain('Empty shelf');
  });

  it('lists a saved library with Favourites and Recent', async () => {
    localStorage.setItem('manga-reader-library', JSON.stringify({
      a_title: { slug: 'a_title', chapters: { 1: 2 }, lastChapter: 1, lastPage: 2, favourite: true },
      b_title: { slug: 'b_title', chapters: { 3: 4 }, lastChapter: 3, lastPage: 4 },
    }));
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('Favourites');
    expect(text).toContain('A Title');
    expect(text).toContain('Recent');
    expect(text).toContain('CH 3 · P 04');
  });
});
