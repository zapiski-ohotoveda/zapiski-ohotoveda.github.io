import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const stories = (await getCollection('collection')).sort((a, b) => a.data.order - b.data.order);
  const items = stories.map((s) => ({
    title: s.data.title,
    link: `/zapiski-ohotoveda/${s.data.slug}/`,
    pubDate: new Date('2024-01-01'),
  }));
  items.push({ title: 'Таёжный капкан (повесть)', link: '/taezhnyy-kapkan/', pubDate: new Date('2024-01-01') });
  return rss({
    title: 'Записки охотоведа',
    description: 'Рассказы, очерки и повесть об охоте, природе и тайге.',
    site: context.site!,
    items,
  });
}
