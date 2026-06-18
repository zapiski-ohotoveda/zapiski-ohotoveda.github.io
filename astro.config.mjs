// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Deployed as the org user-site https://zapiski-ohotoveda.github.io/ (base '/').
export default defineConfig({
  site: 'https://zapiski-ohotoveda.github.io',
  base: '/',
  trailingSlash: 'always',
  integrations: [sitemap()],
  markdown: {
    smartypants: false, // keep the author's punctuation verbatim
  },
});
