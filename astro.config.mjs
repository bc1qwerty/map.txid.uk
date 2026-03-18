// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://map.txid.uk',
  build: {
    assets: '_assets',
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          assetFileNames: '_assets/[hash][extname]',
        },
      },
    },
  },
});
