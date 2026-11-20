import {
  DEFAULT_SOURCE, SOURCE_STORAGE, addHttps, buildUrl, checkTemplate, insertPlaceholder, isUsable, normalizeSource, probeImage,
  resolve, resolveParts, siteLabel, storedSource,
} from './source';
import { TestBed } from '@angular/core/testing';
import { SourceService } from './source.service';

const CUSTOM = 'https://cdn.example.org/manga/{manga}/ch{ch}/{pg}.jpg';
const errors = (key: Parameters<typeof checkTemplate>[0], t: string) => checkTemplate(key, t).filter(p => p.level === 'error').map(p => p.title);
const warnings = (key: Parameters<typeof checkTemplate>[0], t: string) => checkTemplate(key, t).filter(p => p.level === 'warn').map(p => p.title);

describe('template substitution', () => {
  it('fills the default page template as the app always has', () => {
    expect(buildUrl('crimson_tide_ronin', 214, 7))
      .toBe('https://images.mangafreak.me/mangas/crimson_tide_ronin/crimson_tide_ronin_214/crimson_tide_ronin_214_7.jpg');
  });

  it('fills a custom page template and marks the values', () => {
    expect(resolve(CUSTOM, 'image', { manga: 'crimson_tide_ronin', ch: 214, pg: 7 })).toBe('https://cdn.example.org/manga/crimson_tide_ronin/ch214/7.jpg');
    expect(resolveParts(CUSTOM, 'image', { manga: 'a_b', ch: 2, pg: 3 })).toEqual([
      { text: 'https://cdn.example.org/manga/', value: false }, { text: 'a_b', value: true }, { text: '/ch', value: false },
      { text: '2', value: true }, { text: '/', value: false }, { text: '3', value: true }, { text: '.jpg', value: false },
    ]);
  });

  it('URL-encodes the search query, with spaces for underscores', () => {
    expect(resolve(DEFAULT_SOURCE.search, 'search', { manga: 'crimson_tide_ronin' })).toBe('https://ww2.mangafreak.me/Find/crimson%20tide%20ronin');
    expect(resolve('https://x.org/s?q={query}', 'search', { manga: 'rock & roll/2?' })).toBe('https://x.org/s?q=rock%20%26%20roll%2F2%3F');
  });

  it("spells the chapter link's name as MangaFreak's chapter pages do", () => {
    expect(resolve(DEFAULT_SOURCE.chapter, 'chapter', { manga: 'paper_moon_courier', ch: 58 })).toBe('https://ww2.mangafreak.me/Read1_Paper_Moon_Courier_58');
  });

  it('leaves placeholders a template does not know as typed', () => {
    expect(resolve('https://x.org/{manga}/{page}/{ch}_{pg}', 'image', { manga: 'm', ch: 1, pg: 2 })).toBe('https://x.org/m/{page}/1_2');
    expect(resolve('https://x.org/{query}/{ch}', 'search', { manga: 'm' })).toBe('https://x.org/m/{ch}');
  });
});

describe('template rules', () => {
  it('accepts the defaults', () => {
    for (const k of ['image', 'search', 'chapter'] as const) expect(checkTemplate(k, DEFAULT_SOURCE[k])).toEqual([]);
  });

  it('requires a page template, and lets the two links be empty', () => {
    expect(errors('image', '  ')).toEqual(['Page images need an address.']);
    expect(checkTemplate('search', '')).toEqual([]);
    expect(checkTemplate('chapter', '')).toEqual([]);
  });

  it('needs {ch} and {pg} in page images', () => {
    expect(errors('image', 'https://cdn.example.org/{manga}/{ch}.jpg')).toEqual(['Add {pg}.']);
    expect(errors('image', 'https://cdn.example.org/{manga}/{pg}.jpg')).toEqual(['Add {ch}.']);
    expect(errors('image', 'https://cdn.example.org/{manga}.jpg')).toEqual(['Add {ch}.', 'Add {pg}.']);
  });

  it('only warns about a missing {manga}', () => {
    const t = 'https://cdn.example.org/one/{ch}/{pg}.jpg';
    expect(isUsable('image', t)).toBe(true);
    expect(warnings('image', t)).toEqual(['No {manga}.']);
  });

  it('needs {query} in the search link', () => {
    expect(errors('search', 'https://x.org/find')).toEqual(['Add {query}.']);
  });

  it('needs http(s) in all three', () => {
    expect(errors('image', 'cdn.example.org/{manga}/{ch}/{pg}.jpg')).toEqual(['Start with https:// or http://.']);
    expect(errors('image', 'ftp://cdn.example.org/{manga}/{ch}/{pg}.jpg')).toEqual(['Start with https:// or http://.']);
    expect(errors('search', 'javascript:alert({query})')).toEqual(['Start with https:// or http://.']);
    expect(errors('chapter', 'x.org/{manga}')).toEqual(['Start with https:// or http://.']);
    expect(isUsable('chapter', 'http://x.org/{manga}')).toBe(true);
  });

  it('refuses an address without a site', () => {
    expect(errors('chapter', 'https://')).toEqual(['Not a web address.']);
    expect(errors('chapter', 'https:// bad host/{ch}')).toEqual(['Not a web address.']);
  });

  it('warns about a placeholder the field does not take', () => {
    expect(warnings('search', 'https://x.org/{query}/{pg}')).toEqual(["{pg} isn't a placeholder here."]);
  });
});

describe('one-tap fixes', () => {
  const fixOf = (key: Parameters<typeof checkTemplate>[0], t: string, label: string) =>
    checkTemplate(key, t).find(p => p.fix?.label === label)!.fix!.apply(t);

  it('Add https:// puts it in front, completes //host or replaces another scheme', () => {
    expect(addHttps('cdn.example.org/{ch}')).toBe('https://cdn.example.org/{ch}');
    expect(addHttps('//cdn.example.org/{ch}')).toBe('https://cdn.example.org/{ch}');
    expect(addHttps('ftp://cdn.example.org/{ch}')).toBe('https://cdn.example.org/{ch}');
    expect(fixOf('image', 'cdn.example.org/{manga}/ch{ch}/{pg}.jpg', 'Add https://')).toBe('https://cdn.example.org/{manga}/ch{ch}/{pg}.jpg');
  });

  it('Insert {pg} goes before the file extension, with a separator', () => {
    expect(fixOf('image', 'https://images.mangafreak.me/mangas/{manga}/{manga}_{ch}/{manga}_{ch}.jpg', 'Insert {pg}'))
      .toBe('https://images.mangafreak.me/mangas/{manga}/{manga}_{ch}/{manga}_{ch}_{pg}.jpg');
    expect(fixOf('image', 'https://cdn.example.org/manga/{manga}/ch{ch}/.png', 'Insert {pg}')).toBe('https://cdn.example.org/manga/{manga}/ch{ch}/{pg}.png');
    expect(insertPlaceholder('https://x.org/{manga}/{pg}', 'ch', 'image')).toBe('https://x.org/{manga}/{pg}_{ch}');
  });

  it('Insert {query} goes at the end of a search link', () => {
    expect(fixOf('search', 'https://x.org/search?q=', 'Insert {query}')).toBe('https://x.org/search?q={query}');
    expect(fixOf('search', 'https://x.org/find', 'Insert {query}')).toBe('https://x.org/find/{query}');
  });

  it('every fix leaves a usable template', () => {
    const broken = ['cdn.example.org/{manga}/{ch}/{pg}.jpg', 'https://x.org/{manga}/{ch}.jpg', 'https://x.org/{manga}/{pg}.jpg'];
    for (let t of broken) {
      for (let i = 0; i < 3 && !isUsable('image', t); i++) t = checkTemplate('image', t).find(p => p.fix)!.fix!.apply(t);
      expect(isUsable('image', t)).toBe(true);
    }
  });
});

describe('stored templates', () => {
  it('falls back to the defaults for anything missing, mistyped or invalid', () => {
    expect(normalizeSource(null)).toEqual(DEFAULT_SOURCE);
    expect(normalizeSource('nonsense')).toEqual(DEFAULT_SOURCE);
    expect(normalizeSource([1, 2])).toEqual(DEFAULT_SOURCE);
    expect(normalizeSource({ image: 42, search: { a: 1 }, chapter: null })).toEqual(DEFAULT_SOURCE);
    expect(normalizeSource({ image: 'https://x.org/{ch}.jpg' }).image).toBe(DEFAULT_SOURCE.image);
    expect(normalizeSource({ image: ` ${CUSTOM} `, search: '', chapter: 'ftp://x' })).toEqual({ image: CUSTOM, search: '', chapter: DEFAULT_SOURCE.chapter });
  });

  it('stores only what differs from the defaults', () => {
    expect(storedSource({ ...DEFAULT_SOURCE })).toBeNull();
    expect(storedSource({ ...DEFAULT_SOURCE, search: '' })).toEqual({ search: '' });
  });

  it('survives broken JSON and storage that throws', () => {
    localStorage.setItem(SOURCE_STORAGE, '{not json');
    expect(TestBed.inject(SourceService).templates()).toEqual(DEFAULT_SOURCE);
    TestBed.resetTestingModule();
    const get = vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(TestBed.inject(SourceService).templates()).toEqual(DEFAULT_SOURCE);
    get.mockRestore();
    localStorage.clear();
  });
});

describe('site labels', () => {
  it('names MangaFreak, a short host, or "the site"', () => {
    expect(siteLabel(DEFAULT_SOURCE.search, 'search')).toBe('MangaFreak');
    expect(siteLabel('https://www.cdn.example.org/s/{query}', 'search')).toBe('cdn.example.org');
    expect(siteLabel('https://images.a-very-long-host-name.example.org/{query}', 'search')).toBe('the site');
    expect(siteLabel('', 'chapter')).toBeNull();
  });
});

describe('probeImage', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
  const stub = (ok: boolean | null) => vi.stubGlobal('Image', class {
    onload: (() => void) | null = null; onerror: (() => void) | null = null; referrerPolicy = ''; naturalWidth = 800; naturalHeight = 1143;
    set src(u: string) { if (u && ok !== null) setTimeout(() => (ok ? this.onload?.() : this.onerror?.())); }
  });

  it('gives the size of a page that loads', async () => {
    stub(true);
    expect(await probeImage('https://x.org/1.jpg')).toMatchObject({ ok: true, width: 800, height: 1143 });
  });

  it('gives one failure for a 404 or a blocked host', async () => {
    stub(false);
    expect(await probeImage('https://x.org/1.jpg')).toEqual({ ok: false });
  });

  it('gives up on a host that never answers', async () => {
    vi.useFakeTimers();
    stub(null);
    const r = probeImage('https://x.org/1.jpg', 1000);
    vi.advanceTimersByTime(1000);
    expect(await r).toEqual({ ok: false });
  });
});
