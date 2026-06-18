// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// NOTE: update `site`/`base` in Task 14 once the GitHub repo name is known.
export default defineConfig({
  site: 'https://example.github.io',
  base: '/',
  trailingSlash: 'always',
  integrations: [sitemap()],
  markdown: {
    smartypants: false, // keep the author's punctuation verbatim
  },
});
