/** Where pages come from, and where the search and "open on site" links go: three URL templates with
 *  placeholders (Settings > Source). Pure functions; SourceService holds the templates in use. */

export type SourceKey = 'image' | 'search' | 'chapter';
export type SourceTemplates = Record<SourceKey, string>;

export const SOURCE_STORAGE = 'manga-reader-source';

export const DEFAULT_SOURCE: Readonly<SourceTemplates> = {
  image: 'https://images.mangafreak.me/mangas/{manga}/{manga}_{ch}/{manga}_{ch}_{pg}.jpg',
  search: 'https://ww2.mangafreak.me/Find/{query}',
  chapter: 'https://ww2.mangafreak.me/Read1_{manga}_{ch}',
};

export const SOURCE_KEYS: readonly SourceKey[] = ['image', 'search', 'chapter'];

/** The placeholders each template understands. */
export const PLACEHOLDERS: Record<SourceKey, readonly string[]> = {
  image: ['manga', 'ch', 'pg'],
  search: ['query'],
  chapter: ['manga', 'ch'],
};

/** Page images can't do without these; a search link can't do without its query. */
const REQUIRED: Record<SourceKey, readonly string[]> = { image: ['ch', 'pg'], search: ['query'], chapter: [] };

/** What a template is filled with: the slug as the app forms it (underscores), a chapter and a page. */
export interface Place { manga: string; ch?: number; pg?: number; }

/** The chapter pages of MangaFreak spell the name with capitals: paper_moon_courier → Paper_Moon_Courier. */
export const titleSlug = (slug: string) => slug.split('_').map(w => (w[0]?.toUpperCase() ?? '') + w.slice(1)).join('_');

/** The text each placeholder becomes. Search: the name with spaces, URL-encoded. */
export function placeholderValues(key: SourceKey, p: Place): Record<string, string> {
  if (key === 'search') return { query: encodeURIComponent(p.manga.replace(/_/g, ' ').trim()) };
  const manga = key === 'chapter' ? titleSlug(p.manga) : p.manga;
  return { manga, ch: String(p.ch ?? 1), pg: String(p.pg ?? 1) };
}

/** A resolved template in pieces: typed text, and the values put in for placeholders (the preview marks them). */
export interface Piece { text: string; value: boolean; }

const TOKEN = /\{([a-z]+)\}/gi;

export function resolveParts(template: string, key: SourceKey, p: Place): Piece[] {
  const values = placeholderValues(key, p);
  const known = PLACEHOLDERS[key];
  const out: Piece[] = [];
  const t = template.trim();
  let at = 0;
  for (const m of t.matchAll(TOKEN)) {
    if (!known.includes(m[1])) continue; // unknown placeholders stay as typed
    if (m.index > at) out.push({ text: t.slice(at, m.index), value: false });
    out.push({ text: values[m[1]], value: true });
    at = m.index + m[0].length;
  }
  if (at < t.length) out.push({ text: t.slice(at), value: false });
  return out;
}

export function resolve(template: string, key: SourceKey, p: Place): string {
  return resolveParts(template, key, p).map(x => x.text).join('');
}

/** A page image address from the default template (what the app used before Source settings; tests use it). */
export function buildUrl(manga: string, ch: number, pg: number) {
  return resolve(DEFAULT_SOURCE.image, 'image', { manga, ch, pg });
}

// ---- Checking ----

export interface Fix { label: string; apply: (template: string) => string; }

/** error: the template is not saved. warn: it is saved, with a note. */
export interface Problem { level: 'error' | 'warn'; title: string; detail?: string; fix?: Fix; }

const SCHEME = /^[a-z][a-z\d+.-]*:\/\//i;

/** "Add https://": replaces another scheme, completes "//host", or puts it in front. */
export function addHttps(t: string): string {
  const s = t.trim();
  if (SCHEME.test(s)) return s.replace(SCHEME, 'https://');
  return 'https://' + s.replace(/^\/+/, '');
}

/** "Insert {pg}": before a file extension at the end (…_{ch}.jpg → …_{ch}_{pg}.jpg), else at the end; joined
 *  with "_" (or "/" in a search link) unless a separator is already there. */
export function insertPlaceholder(t: string, name: string, key: SourceKey): string {
  const s = t.trim();
  const ext = key === 'image' ? s.match(/\.[a-z\d]{2,5}$/i) : null;
  const at = ext ? s.length - ext[0].length : s.length;
  const before = s[at - 1] ?? '';
  const sep = !before || /[/_\-=.?&+#:]/.test(before) ? '' : key === 'search' ? '/' : '_';
  return s.slice(0, at) + sep + `{${name}}` + s.slice(at);
}

const MISSING: Record<string, string> = {
  ch: 'Without it every chapter would show the same pages.',
  pg: 'Without it every page would be the same image.',
  query: 'Without it every search would open the same page.',
};

/** What is wrong with a template, worst first. Empty is fine for the two links (it hides them). */
export function checkTemplate(key: SourceKey, raw: string): Problem[] {
  const t = raw.trim();
  if (!t) {
    return key === 'image'
      ? [{ level: 'error', title: 'Page images need an address.', detail: 'Without one no page can load.', fix: { label: 'Use the default', apply: () => DEFAULT_SOURCE.image } }]
      : [];
  }
  const out: Problem[] = [];
  if (!/^https?:\/\//i.test(t)) {
    out.push({ level: 'error', title: 'Start with https:// or http://.', fix: { label: 'Add https://', apply: addHttps } });
  } else if (!validHost(resolve(t, key, { manga: 'sample', ch: 1, pg: 1 }))) {
    out.push({ level: 'error', title: 'Not a web address.', detail: 'Put the site after https://, as in https://example.org/….' });
  }
  const used = [...t.matchAll(TOKEN)].map(m => m[1]);
  for (const name of REQUIRED[key]) {
    if (!used.includes(name)) {
      out.push({ level: 'error', title: `Add {${name}}.`, detail: MISSING[name], fix: { label: `Insert {${name}}`, apply: s => insertPlaceholder(s, name, key) } });
    }
  }
  if (key === 'image' && !used.includes('manga')) {
    out.push({ level: 'warn', title: 'No {manga}.', detail: 'Every title would load the same pages.' });
  }
  for (const name of new Set(used.filter(n => !PLACEHOLDERS[key].includes(n)))) {
    out.push({ level: 'warn', title: `{${name}} isn't a placeholder here.`, detail: `It stays as typed. This one takes ${PLACEHOLDERS[key].map(n => `{${n}}`).join(', ')}.` });
  }
  return out;
}

export const isUsable = (key: SourceKey, raw: string) => !checkTemplate(key, raw).some(p => p.level === 'error');

function validHost(url: string): boolean {
  try {
    const u = new URL(url);
    return (u.protocol === 'http:' || u.protocol === 'https:') && !!u.hostname && !/\s/.test(url);
  } catch { return false; }
}

// ---- Stored ----

/** Stored templates made safe: each one that is missing, not text or not usable is the default. */
export function normalizeSource(raw: unknown): SourceTemplates {
  const o = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Partial<Record<SourceKey, unknown>>;
  const out = { ...DEFAULT_SOURCE };
  for (const k of SOURCE_KEYS) {
    const v = o[k];
    if (typeof v === 'string' && isUsable(k, v)) out[k] = v.trim();
  }
  return out;
}

/** Only what differs from the defaults is stored; null when nothing does. */
export function storedSource(t: SourceTemplates): Partial<SourceTemplates> | null {
  const diff: Partial<SourceTemplates> = {};
  for (const k of SOURCE_KEYS) if (t[k] !== DEFAULT_SOURCE[k]) diff[k] = t[k];
  return Object.keys(diff).length ? diff : null;
}

/** How a button names a link's site: MangaFreak for its own hosts, else the host (without www.) while it is
 *  short enough for a button, else "the site". Null for an empty template (no button). */
export function siteLabel(template: string, key: SourceKey): string | null {
  if (!template.trim()) return null;
  let host = '';
  try { host = new URL(resolve(template, key, { manga: 'sample', ch: 1, pg: 1 })).hostname; } catch { return 'the site'; }
  if (host === 'mangafreak.me' || host.endsWith('.mangafreak.me')) return 'MangaFreak';
  host = host.replace(/^www\./, '');
  return host && host.length <= 20 ? host : 'the site';
}

// ---- Test ----

export type ProbeResult = { ok: true; width: number; height: number; ms: number } | { ok: false };

/** Loads one image the way the reader does (no referrer). A 404 and a host that blocks the request look the
 *  same to an image, so there is one failure. Gives up after `timeoutMs`. */
export function probeImage(url: string, timeoutMs = 15000): Promise<ProbeResult> {
  return new Promise(done => {
    const img = new Image();
    const start = performance.now();
    const timer = setTimeout(() => { img.onload = img.onerror = null; img.src = ''; done({ ok: false }); }, timeoutMs);
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      clearTimeout(timer);
      done(img.naturalWidth ? { ok: true, width: img.naturalWidth, height: img.naturalHeight, ms: performance.now() - start } : { ok: false });
    };
    img.onerror = () => { clearTimeout(timer); done({ ok: false }); };
    img.src = url;
  });
}
