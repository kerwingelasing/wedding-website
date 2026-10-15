import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { content, coupleNames, longDate } from './src/content.js';

// Fills %TITLE% and %DESCRIPTION% in the HTML so link previews (Messenger, Viber)
// show the couple's names without running JavaScript. Link previews can't run JavaScript,
// so they use the defaults in content.js; keep those in step with the dashboard before deploying.
const htmlContent = {
  name: 'html-content',
  transformIndexHtml(html) {
    return html
      .replaceAll('%TITLE%', `${content.couple.first} and ${content.couple.second}'s Wedding`)
      .replaceAll('%DESCRIPTION%', `${coupleNames} · ${longDate(content.ceremonyStart)} · ${content.place}`);
  },
};

export default defineConfig({
  plugins: [htmlContent],
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
});
