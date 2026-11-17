import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const page = path => fileURLToPath(new URL(path, import.meta.url));

// Shared header, footer and newsletter markup. Each page includes them with
// <!--partial:name--> so navigation stays identical across the static pages.
function partials() {
  return {
    name: 'doxa-partials',
    transformIndexHtml(html, ctx) {
      const route = (ctx.path || '/').replace(/index\.html$/, '');
      return html.replace(/<!--partial:([a-z-]+)-->/g, (_, name) => {
        let markup = readFileSync(`${root}partials/${name}.html`, 'utf8');
        if (name === 'header') {
          markup = markup.replace(/<a href="([^"]+)" data-nav>/g, (tag, href) =>
            href === route ? `<a href="${href}" data-nav aria-current="page">` : tag);
        }
        return markup;
      });
    },
  };
}

export default defineConfig({
  plugins: [partials()],
  build: {
    chunkSizeWarningLimit: 700, // three.js hero chunk, loaded lazily after first paint
    rollupOptions: {
      input: {
        home: page('./index.html'),
        genesis: page('./the-genesis/index.html'),
        preorder: page('./pre-order/index.html'),
        confirmation: page('./pre-order/bevestiging/index.html'),
        story: page('./ons-verhaal/index.html'),
        about: page('./over-mij/index.html'),
        community: page('./community/index.html'),
      },
    },
  },
});
