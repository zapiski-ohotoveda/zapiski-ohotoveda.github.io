import { describe, it, expect } from 'vitest';
import { convertWork } from './convert.mjs';

const splitWork = {
  id: 'demo', title: 'Демо', single_page: false, strip: ['КНИГА.'],
  stories: [
    { slug: 'opening', title: 'Вступление', untitled: true, kind: 'story' },
    { slug: 'kot', title: 'Соболиный кот', kind: 'story' },
    { slug: 'dogs', title: 'Собаки', kind: 'story', subsections: ['Веста'] },
  ],
};

const splitSource = [
  'КНИГА.',
  '',
  '   ПРОШЛОЕ НЕ ОСТАВЛЯЕТ НАС\\!',
  '',
  '   Я родился в Павлодаре.',
  '',
  '                 СОБОЛИНЫЙ КОТ.',
  '',
  '   История про кота.',
  '',
  '                 \\*\\*\\*',
  '',
  '   Вторая часть истории.',
  '',
  '                 СОБАКИ.',
  '',
  '   Про собак вообще.',
  '',
  '                 ВЕСТА.',
  '',
  '   Веста была умной.',
  '',
].join('\n');

describe('convertWork (split)', () => {
  const entries = convertWork(splitSource, splitWork);

  it('produces one entry per story', () => {
    expect(entries.map((e) => e.slug)).toEqual(['opening', 'kot', 'dogs']);
  });
  it('drops strip lines and assigns the opening text + epigraph to the untitled opening', () => {
    const opening = entries[0];
    expect(opening.body).not.toContain('КНИГА');
    expect(opening.body).toContain('> ПРОШЛОЕ НЕ ОСТАВЛЯЕТ НАС!');
    expect(opening.body).toContain('Я родился в Павлодаре.');
  });
  it('converts scene breaks to thematic breaks', () => {
    expect(entries[1].body).toContain('\n---\n');
    expect(entries[1].body).toContain('История про кота.');
    expect(entries[1].body).toContain('Вторая часть истории.');
  });
  it('renders subsections as ## headings inside the parent story', () => {
    expect(entries[2].slug).toBe('dogs');
    expect(entries[2].body).toContain('## Веста');
    expect(entries[2].body).toContain('Веста была умной.');
  });
  it('sets order to the story index', () => {
    expect(entries.map((e) => e.order)).toEqual([0, 1, 2]);
  });
});

const novellaWork = {
  id: 'nov', title: 'Таёжный капкан', single_page: true,
  strip: ['ПОВЕСТЬ. Готова в печать.'],
  stories: [
    { slug: 'glava-pervaya', title: 'Глава первая', kind: 'chapter' },
    { slug: 'glava-vtoraya', title: 'Глава вторая', kind: 'chapter' },
  ],
};
const novellaSource = [
  '   ПОВЕСТЬ. Готова в печать.',
  '',
  '   Вступительный абзац.',
  '',
  '          ГЛАВА ПЕРВАЯ.',
  '',
  '   Текст первой главы.',
  '',
  '          ГЛАВА ВТОРАЯ.',
  '',
  '   Текст второй главы.',
  '',
].join('\n');

describe('convertWork (single_page)', () => {
  const entries = convertWork(novellaSource, novellaWork);
  it('returns exactly one entry', () => {
    expect(entries).toHaveLength(1);
    expect(entries[0].slug).toBe('taezhnyy-kapkan');
  });
  it('keeps the framing intro before any chapter heading', () => {
    expect(entries[0].body.indexOf('Вступительный абзац.')).toBeLessThan(
      entries[0].body.indexOf('## Глава первая'),
    );
  });
  it('emits chapters as ## headings', () => {
    expect(entries[0].body).toContain('## Глава первая');
    expect(entries[0].body).toContain('## Глава вторая');
    expect(entries[0].body).not.toContain('Готова в печать');
  });
});
