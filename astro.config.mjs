// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // GitHub Pages will serve under /<repo>/
  site: 'https://qwerty-works.github.io/arxiv-notes',
  base: '/arxiv-notes',
  integrations: [
    // sitemap will be emitted during build
    (await import('@astrojs/sitemap')).default(),
  ],
});
