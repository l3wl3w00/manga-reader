import { TestBed } from '@angular/core/testing';
import { SourceService } from './source.service';
import { DEFAULT_SOURCE, SOURCE_STORAGE } from './source';

const CUSTOM = 'https://cdn.example.org/manga/{manga}/ch{ch}/{pg}.jpg';
const stored = () => JSON.parse(localStorage.getItem(SOURCE_STORAGE) ?? 'null');

describe('SourceService', () => {
  let source: SourceService;
  beforeEach(() => { localStorage.clear(); source = TestBed.inject(SourceService); });

  it('uses the defaults when nothing is stored', () => {
    expect(source.templates()).toEqual(DEFAULT_SOURCE);
    expect(source.pageUrl('a_b', 2, 3)).toBe('https://images.mangafreak.me/mangas/a_b/a_b_2/a_b_2_3.jpg');
    expect(source.searchSite()).toBe('MangaFreak');
  });

  it('saves a valid template on commit and stores it', () => {
    source.edit('image', ` ${CUSTOM} `);
    expect(source.pageUrl('a_b', 2, 3)).toContain('mangafreak'); // typing alone changes nothing
    expect(source.commit('image')).toBe(true);
    expect(source.pageUrl('a_b', 2, 3)).toBe('https://cdn.example.org/manga/a_b/ch2/3.jpg');
    expect(stored()).toEqual({ image: CUSTOM });
    expect(source.text('image')).toBe(CUSTOM);
  });

  it('does not save an invalid template: the last valid one stays in use', () => {
    source.edit('image', CUSTOM);
    source.commit('image');
    source.edit('image', 'https://cdn.example.org/manga/{manga}/ch{ch}.jpg');
    expect(source.commit('image')).toBe(false);
    expect(source.refused().has('image')).toBe(true);
    expect(source.text('image')).toBe('https://cdn.example.org/manga/{manga}/ch{ch}.jpg');
    expect(source.templates().image).toBe(CUSTOM);
    expect(source.pageUrl('a_b', 2, 3)).toBe('https://cdn.example.org/manga/a_b/ch2/3.jpg');
    expect(stored()).toEqual({ image: CUSTOM });
  });

  it('saves a template with only a warning', () => {
    source.edit('image', 'https://cdn.example.org/one/{ch}/{pg}.jpg');
    expect(source.commit('image')).toBe(true);
    expect(source.templates().image).toBe('https://cdn.example.org/one/{ch}/{pg}.jpg');
  });

  it('turns a link off when emptied, and names the host of a custom one', () => {
    source.edit('search', '');
    source.commit('search');
    source.edit('chapter', 'https://reader.example.org/{manga}/{ch}');
    source.commit('chapter');
    expect(source.searchSite()).toBeNull();
    expect(source.searchUrl('crimson_tide_ronin')).toBeNull();
    expect(source.chapterSite()).toBe('reader.example.org');
    expect(source.chapterUrl('crimson_tide_ronin', 214)).toBe('https://reader.example.org/Crimson_Tide_Ronin/214');
    expect(stored()).toEqual({ search: '', chapter: 'https://reader.example.org/{manga}/{ch}' });
  });

  it('resets one field, or all of them and the stored key', () => {
    source.edit('image', CUSTOM); source.commit('image');
    source.edit('search', ''); source.commit('search');
    source.edit('chapter', 'nope'); source.commit('chapter');
    source.reset('image');
    expect(source.templates().image).toBe(DEFAULT_SOURCE.image);
    expect(stored()).toEqual({ search: '' });
    source.resetAll();
    expect(source.templates()).toEqual(DEFAULT_SOURCE);
    expect(source.refused().size).toBe(0);
    expect(source.drafts()).toEqual({});
    expect(localStorage.getItem(SOURCE_STORAGE)).toBeNull();
  });

  it('reads stored templates, dropping the bad ones', () => {
    localStorage.setItem(SOURCE_STORAGE, JSON.stringify({ image: CUSTOM, search: 'https://x.org/find', chapter: '' }));
    TestBed.resetTestingModule();
    const s = TestBed.inject(SourceService);
    expect(s.templates()).toEqual({ image: CUSTOM, search: DEFAULT_SOURCE.search, chapter: '' });
    expect(s.chapterSite()).toBeNull();
  });
});
