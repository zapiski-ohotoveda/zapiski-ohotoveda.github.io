import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const subsection = z.object({ title: z.string(), anchor: z.string() });

const baseFields = {
  title: z.string(),
  slug: z.string(),
  order: z.number(),
  work: z.string(),
  subsections: z.array(subsection).optional(),
};

const collection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/collection' }),
  schema: z.object(baseFields),
});

const novella = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/novella' }),
  schema: z.object(baseFields),
});

export const collections = { collection, novella };
