import { TestBed } from '@angular/core/testing';
import { SourceTabComponent } from './source-tab.component';
import { SourceService } from '../../../services/source.service';
import { ReaderService } from '../../../services/reader.service';
import { DEFAULT_SOURCE } from '../../../services/source';

const CUSTOM = 'https://cdn.example.org/manga/{manga}/ch{ch}/{pg}.jpg';
const settle = async () => { for (let i = 0; i < 5; i++) await new Promise(r => setTimeout(r)); };

describe('SourceTabComponent', () => {
  let el: HTMLElement;
  let source: SourceService;
  let fixture: ReturnType<typeof TestBed.createComponent<SourceTabComponent>>;

  beforeEach(async () => {
    localStorage.clear();
    const reader = TestBed.inject(ReaderService);
    reader.manga.set('crimson_tide_ronin'); reader.chapter.set(214); reader.page.set(7);
    source = TestBed.inject(SourceService);
    fixture = TestBed.createComponent(SourceTabComponent);
    el = fixture.nativeElement;
    document.body.appendChild(el);
    await fixture.whenStable();
  });
  afterEach(() => { el.remove(); vi.unstubAllGlobals(); });

  const input = (id: string) => el.querySelector<HTMLInputElement>('#src-' + id)!;
  const type = async (id: string, text: string) => {
    const i = input(id);
    i.focus();
    i.value = text;
    i.dispatchEvent(new Event('input'));
    i.blur();
    await fixture.whenStable();
  };
  const button = (text: string) => [...el.querySelectorAll('button')].find(b => b.textContent!.trim() === text)!;
  const text = () => el.textContent!.replace(/\s+/g, ' ');

  it('shows the default, the resolved preview with values marked, and has real labels', () => {
    expect(el.querySelector('label[for=src-image]')!.textContent).toContain('Page images');
    expect(el.querySelector('label[for=src-search]')).toBeTruthy();
    expect(el.querySelector('label[for=src-chapter]')).toBeTruthy();
    expect(text()).toContain('Crimson Tide Ronin, chapter 214, page 7');
    const marked = [...el.querySelectorAll('#src-image-prev .text-shu')].map(b => b.textContent);
    expect(marked).toEqual(['crimson_tide_ronin', 'crimson_tide_ronin', '214', 'crimson_tide_ronin', '214', '7']);
  });

  it('saves a valid template on blur and tags it Edited', async () => {
    await type('image', CUSTOM);
    expect(source.templates().image).toBe(CUSTOM);
    expect(el.querySelector('section')!.textContent).toContain('Edited');
  });

  it('does not save an invalid template: Not saved, and the reader keeps the last valid one', async () => {
    await type('image', CUSTOM);
    await type('image', 'https://cdn.example.org/manga/{manga}/ch{ch}.jpg');
    expect(source.templates().image).toBe(CUSTOM);
    expect(text()).toContain('Not saved');
    expect(text()).toContain('Add {pg}.');
    expect(input('image').getAttribute('aria-invalid')).toBe('true');
    expect(button('Test').disabled).toBe(true);

    button('Insert {pg}').click();
    await fixture.whenStable();
    expect(source.templates().image).toBe('https://cdn.example.org/manga/{manga}/ch{ch}_{pg}.jpg');
    expect(text()).not.toContain('Not saved');
  });

  it('offers Add https:// for an address without a scheme', async () => {
    await type('image', 'cdn.example.org/manga/{manga}/ch{ch}/{pg}.jpg');
    button('Add https://').click();
    await fixture.whenStable();
    expect(source.templates().image).toBe(CUSTOM);
  });

  it('inserts a placeholder chip at the caret', async () => {
    const i = input('search');
    i.focus();
    i.value = 'https://x.org/find?q=&lang=en';
    i.dispatchEvent(new Event('input'));
    i.setSelectionRange(21, 21);
    el.querySelector<HTMLButtonElement>('button[aria-label="Insert {query}"]')!.click();
    expect(i.value).toBe('https://x.org/find?q={query}&lang=en');
    expect(document.activeElement).toBe(i);
    expect(i.selectionStart).toBe(28);
    i.blur();
    expect(source.templates().search).toBe('https://x.org/find?q={query}&lang=en');
  });

  it('says an emptied link hides its button, and resets', async () => {
    await type('search', '');
    expect(source.templates().search).toBe('');
    expect(text()).toContain('Empty, so the search button is hidden.');
    el.querySelector<HTMLButtonElement>('button[aria-label="Reset search link to default"]')!.click();
    await fixture.whenStable();
    expect(source.templates().search).toBe(DEFAULT_SOURCE.search);
  });

  it('Reset all three puts back the defaults', async () => {
    await type('image', CUSTOM);
    await type('chapter', '');
    button('Reset all three').click();
    await fixture.whenStable();
    expect(source.templates()).toEqual(DEFAULT_SOURCE);
  });

  function stubImage(ok: boolean) {
    const urls: string[] = [];
    vi.stubGlobal('Image', class {
      onload: (() => void) | null = null; onerror: (() => void) | null = null; referrerPolicy = ''; naturalWidth = 800; naturalHeight = 1143;
      set src(u: string) { urls.push(u + ' ' + this.referrerPolicy); setTimeout(() => (ok ? this.onload?.() : this.onerror?.())); }
    });
    return urls;
  }

  it('Test loads the resolved page with no referrer and shows its size', async () => {
    await type('image', CUSTOM);
    const urls = stubImage(true);
    button('Test').click();
    await fixture.whenStable();
    expect(text()).toContain('Loading the test page');
    await settle(); await fixture.whenStable();
    expect(urls).toEqual(['https://cdn.example.org/manga/crimson_tide_ronin/ch214/7.jpg no-referrer']);
    expect(text()).toContain('Loaded');
    expect(text()).toContain('800 × 1143');
    expect(button('Test again')).toBeTruthy();
  });

  it('a failed Test still keeps the template, with a warning', async () => {
    await type('image', CUSTOM);
    stubImage(false);
    button('Test').click();
    await settle(); await fixture.whenStable();
    expect(text()).toContain("Couldn't load");
    expect(text()).toContain('Saved anyway.');
    expect(source.templates().image).toBe(CUSTOM);
  });
});
