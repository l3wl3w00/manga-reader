// Inlines the built JS, CSS and favicon into one self-contained HTML file.
// Usage: node scripts/inline.mjs  (after `ng build`)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist/manga-reader/browser';
const out = 'dist/manga-reader.html';
let html = readFileSync(join(dir, 'index.html'), 'utf8');
const read = (f) => readFileSync(join(dir, f), 'utf8');

// Stylesheets: drop the <noscript> fallback, then replace each local <link> with an inline <style>.
// Remote stylesheets (Google Fonts) stay links.
html = html.replace(/<noscript><link rel="stylesheet"[^>]*><\/noscript>/g, '');
html = html.replace(/<link rel="stylesheet" href="(?!https?:)([^"]+)"[^>]*>/g, (_, href) => `<style>${read(href)}</style>`);

// Scripts: inline each module script. Escape "</script" so the JS can't close the tag early.
html = html.replace(/<script src="([^"]+)" type="module"><\/script>/g, (_, src) =>
  `<script type="module">${read(src).replace(/<\/script/gi, '<\\/script')}</script>`);

// Favicon as a data URI.
html = html.replace(/<link rel="icon" type="image\/x-icon" href="([^"]+)">/, (_, href) =>
  `<link rel="icon" type="image/x-icon" href="data:image/x-icon;base64,${readFileSync(join(dir, href)).toString('base64')}">`);

const leftover = html.match(/(?:src|href)="(?!data:|https?:|\.\/")[^"]+\.(?:js|css)"/);
if (leftover) throw new Error(`Unresolved asset reference: ${leftover[0]}`);
if (readdirSync(dir).some((f) => f.startsWith('chunk-'))) throw new Error('Lazy chunks found; they cannot be inlined.');

writeFileSync(out, html);
console.log(`Wrote ${out} (${(html.length / 1024).toFixed(1)} kB)`);
