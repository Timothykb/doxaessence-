import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  build: { rollupOptions: { output: { manualChunks: id => id.includes('/three/build/') ? 'three-core' : undefined }, input: {
    websiteDemo: fileURLToPath(new URL('./website-demo/index.html', import.meta.url)),
    genesisDemo: fileURLToPath(new URL('./genesis-demo/index.html', import.meta.url)),
    preorder: fileURLToPath(new URL('./storefront/preorder/index.html', import.meta.url)),
    orderStatus: fileURLToPath(new URL('./order-status/index.html', import.meta.url)),
    checkout: fileURLToPath(new URL('./storefront/checkout/index.html', import.meta.url)),
    product: fileURLToPath(new URL('./storefront/genesis/index.html', import.meta.url)),
    storefront: fileURLToPath(new URL('./storefront/index.html', import.meta.url)),
    admin: fileURLToPath(new URL('./admin/index.html', import.meta.url)),
    home: fileURLToPath(new URL('./index.html', import.meta.url)),
    privacy: fileURLToPath(new URL('./privacy/index.html', import.meta.url)),
    thanks: fileURLToPath(new URL('./thank-you/index.html', import.meta.url)),
    community: fileURLToPath(new URL('./community/index.html', import.meta.url)),
  } } },
});
