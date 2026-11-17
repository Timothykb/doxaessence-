// Builds a self-contained demo (dist-demo/) for previewing outside Cloudflare:
// every page gets its CSS, JS, fonts and the hero photo inlined, and all
// internal links are relative. Usage: pnpm build:demo
import { build } from 'vite';
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import config from '../vite.config.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, 'dist-demo');
const tmp = join(root, '.demo-tmp');
const pages = ['index.html', 'the-genesis/index.html', 'pre-order/index.html', 'pre-order/bevestiging/index.html', 'ons-verhaal/index.html', 'over-mij/index.html', 'community/index.html'];
const routes = new Set(['/', '/the-genesis/', '/pre-order/', '/pre-order/bevestiging/', '/ons-verhaal/', '/over-mij/', '/community/']);
const dataUri = (file, type) => `data:${type};base64,${readFileSync(join(root, 'public', file)).toString('base64')}`;
const photo = dataUri('images/genesis-n1-bordeaux.webp', 'image/webp');
const logoMask = dataUri('brand/doxa-logo-mask.png', 'image/png');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const page of pages) {
  rmSync(tmp, { recursive: true, force: true });
  await build({
    root, logLevel: 'warn', configFile: false, plugins: config.plugins, publicDir: false,
    build: {
      outDir: tmp, emptyOutDir: true, assetsInlineLimit: 50_000_000, cssCodeSplit: false, modulePreload: false,
      rollupOptions: { input: join(root, page), output: { inlineDynamicImports: true } },
    },
  });
  let html = readFileSync(join(tmp, page), 'utf8');
  const assets = join(tmp, 'assets');
  // inline styles and scripts
  html = html.replace(/<link rel="stylesheet"[^>]*href="[^"]*\/assets\/([^"]+)"[^>]*>/g, (_, f) =>
    `<style>${readFileSync(join(assets, f), 'utf8').replaceAll('/brand/doxa-logo-mask.png', logoMask)}</style>`);
  html = html.replace(/<script type="module"[^>]*src="[^"]*\/assets\/([^"]+)"[^>]*><\/script>/g, (_, f) => {
    const js = readFileSync(join(assets, f), 'utf8').replaceAll('/images/genesis-n1-bordeaux.webp', photo).replaceAll('</script', '<\\/script');
    return `<script type="module">${js}</script>`;
  });
  html = html.replace(/<link rel="modulepreload"[^>]*>/g, '');
  // relative links and images
  const depth = page.split('/').length - 1;
  const pre = depth ? '../'.repeat(depth) : './';
  html = html.replace(/(href|src)="(\/(?!\/)[^"#]*)(#[^"]*)?"/g, (_, attr, path, frag = '') =>
    routes.has(path) ? `${attr}="${pre}${path.slice(1)}index.html${frag}"` : `${attr}="${pre}${path.slice(1)}${frag}"`);
  html = html.replace(/<form method="post" action="\/__access\/logout">[\s\S]*?<\/form>/g, '').replace('<span>Privé preview</span>', '<span>Demo — niet openbaar</span>');
  mkdirSync(dirname(join(out, page)), { recursive: true });
  writeFileSync(join(out, page), html);
}
rmSync(tmp, { recursive: true, force: true });
mkdirSync(join(out, 'images'), { recursive: true });
for (const f of ['genesis-n1-bordeaux.webp', 'campaign-founder.webp', 'campaign-newspapers.webp']) cpSync(join(root, 'public/images', f), join(out, 'images', f));
console.log('demo built:', readdirSync(out));
