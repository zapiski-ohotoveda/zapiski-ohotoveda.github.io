import type { APIContext } from 'astro';

export async function GET({ site }: APIContext) {
  const body = `User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap-index.xml', site).href}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}
