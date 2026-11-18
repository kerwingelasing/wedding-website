import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { longDate, mergeContent } from './src/content.js';
import { renderOgImage } from './scripts/og-image.mjs';

// Link previews (Messenger, Viber, Facebook) read only the raw HTML and never run JavaScript,
// so the couple's names, date and place have to be written into the HTML at build time.
// Production builds read the live wedding details (config/content, public) so the preview matches
// what the couple saved on the dashboard; changes they make later show in previews after the next
// deploy. If Firestore can't be reached, the defaults in content.js are used.

// Firestore's REST format wraps every value ({ stringValue: 'x' }, { mapValue: { fields } }, ...).
function fromRest(v) {
  if (!v || typeof v !== 'object') return v;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromRest);
  if ('mapValue' in v) return fieldsFromRest(v.mapValue.fields);
  return undefined;
}
const fieldsFromRest = (fields = {}) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fromRest(v)]));

async function liveContent() {
  try {
    const project = JSON.parse(readFileSync('.firebaserc', 'utf8')).projects.default;
    const url = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/config/content`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.status === 404) return mergeContent(null); // nothing saved on the dashboard yet
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const c = mergeContent(fieldsFromRest((await res.json()).fields));
    console.log(`Link preview: ${c.couple.first} & ${c.couple.second} (live wedding details)`);
    return c;
  } catch (ex) {
    console.warn(`Link preview: couldn't read the live wedding details (${ex.message}); using the defaults in content.js.`);
    return mergeContent(null);
  }
}

// The saved site look (config/site.theme), so the preview image uses the same colors.
async function liveLook() {
  try {
    const project = JSON.parse(readFileSync('.firebaserc', 'utf8')).projects.default;
    const url = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/config/site`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const theme = res.ok ? fieldsFromRest((await res.json()).fields).theme : null;
    return ['blush', 'golden', 'garden'].includes(theme) ? theme : 'blush';
  } catch {
    return 'blush';
  }
}

// Shared links need an absolute image URL. Set SITE_URL when a custom domain is added.
const firebaseSite = JSON.parse(readFileSync('firebase.json', 'utf8')).hosting.site;
const SITE_URL = (process.env.SITE_URL || `https://${firebaseSite}.web.app`).replace(/\/$/, '');

const htmlContent = (c) => ({
  name: 'html-content',
  transformIndexHtml(html) {
    return html
      .replaceAll('%TITLE%', `${c.couple.first} and ${c.couple.second}'s Wedding`)
      .replaceAll('%DESCRIPTION%', `${c.couple.first} & ${c.couple.second} · ${longDate(c.ceremonyStart)} · ${c.place}`)
      .replaceAll('%SITE_URL%', SITE_URL);
  },
});

// Draws the 1200 x 630 preview image into the build as /og-image.png (production builds only).
const ogImage = (c, look) => ({
  name: 'og-image',
  apply: 'build',
  async generateBundle() {
    const source = await renderOgImage({
      first: c.couple.first, second: c.couple.second, dateText: longDate(c.ceremonyStart), place: c.place, look,
    });
    this.emitFile({ type: 'asset', fileName: 'og-image.png', source });
    console.log(`Link preview image: ${look} look`);
  },
});

async function plugins(command) {
  if (command !== 'build' || process.env.VITEST) return [htmlContent(mergeContent(null))];
  const [c, look] = await Promise.all([liveContent(), liveLook()]);
  return [htmlContent(c), ogImage(c, look)];
}

export default defineConfig(async ({ command }) => ({
  plugins: await plugins(command),
  test: {
    include: ['tests/**/*.test.js'],
    testTimeout: 20000,
    hookTimeout: 30000,
  },
  build: {
    chunkSizeWarningLimit: 700, // admin page bundles the full Firestore SDK
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        admin: resolve(import.meta.dirname, 'admin/index.html'),
      },
    },
  },
}));
