import { describe, it, expect } from 'vitest';
import { loadManifest, indexWork } from './manifest.mjs';

describe('loadManifest + indexWork', () => {
  const m = loadManifest('structure.manifest.yaml');
  const collection = m.works.find((w) => w.id === 'zapiski-ohotoveda');
  const novella = m.works.find((w) => w.id === 'taezhnyy-kapkan');

  it('loads both works', () => {
    expect(collection).toBeTruthy();
    expect(novella.single_page).toBe(true);
  });

  it('indexes story titles by normalized key', () => {
    const idx = indexWork(collection);
    expect(idx.titleMap.get('СОБОЛИНЫЙ КОТ').slug).toBe('soboliny-kot');
    expect(idx.titleMap.get('ВРАГ НАРОДА').slug).toBe('vrag-naroda');
  });

  it('indexes subsections to their parent story', () => {
    const idx = indexWork(collection);
    const sub = idx.subsectionMap.get('ВЕСТА');
    expect(sub.parent.slug).toBe('sobaki-v-moey-seme');
    expect(sub.title).toBe('Веста');
  });

  it('builds a strip set of normalized lines', () => {
    const idx = indexWork(collection);
    expect(idx.stripSet.has('КНИГА')).toBe(true);
  });

  it('marks the first collection story as untitled opening', () => {
    expect(collection.stories[0].untitled).toBe(true);
  });
});
