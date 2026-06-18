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
  id: 'taezhnyy-kapkan', title: 'Таёжный капкан', single_page: true,
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
  it('returns exactly one entry whose slug is the work id', () => {
    expect(entries).toHaveLength(1);
    expect(entries[0].slug).toBe(novellaWork.id);
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

describe('convertWork epigraph boundary (no content loss)', () => {
  const work = {
    id: 'demo2', title: 'Демо2', single_page: false, strip: [],
    stories: [{ slug: 'a', title: 'А', untitled: true, kind: 'story' }],
  };
  it('keeps a mostly-lowercase line that merely starts with CAPS as a paragraph', () => {
    const src = ['   ЧЕМ ЯРЧЕ ЭЙФОРИЯ, тем глубже падение. Леонид проснулся поздно.', ''].join('\n');
    const [entry] = convertWork(src, work);
    expect(entry.body).toContain('ЧЕМ ЯРЧЕ ЭЙФОРИЯ, тем глубже падение. Леонид проснулся поздно.');
    expect(entry.body).not.toContain('> ЧЕМ ЯРЧЕ');
  });
  it('treats a fully-uppercase standalone line as an epigraph', () => {
    const src = ['   ПРОШЛОЕ НЕ ОСТАВЛЯЕТ НАС\\!', ''].join('\n');
    const [entry] = convertWork(src, work);
    expect(entry.body).toContain('> ПРОШЛОЕ НЕ ОСТАВЛЯЕТ НАС!');
  });
});

describe('convertWork manifest-declared epigraph (sentence case)', () => {
  const work = {
    id: 'demo3', title: 'Демо3', single_page: false, strip: [],
    stories: [
      { slug: 'opening', title: 'Вступление', untitled: true, kind: 'story' },
      { slug: 'dogs', title: 'Собаки в моей жизни', kind: 'story',
        epigraph: 'Охота без собак, как детство без сказок!' },
    ],
  };
  const src = [
    '   Вступительный текст.',
    '',
    '        Собаки в моей жизни.',
    '',
    '     Охота без собак, как детство без сказок\\!',
    '',
    '   Моя жизнь с собаками.',
    '',
  ].join('\n');
  const entries = convertWork(src, work);

  it('splits the sentence-case heading into its own story', () => {
    expect(entries.map((e) => e.slug)).toEqual(['opening', 'dogs']);
  });
  it('wraps the declared sentence-case epigraph as a blockquote, keeping its case', () => {
    expect(entries[1].body).toContain('> Охота без собак, как детство без сказок!');
    expect(entries[1].body).toContain('Моя жизнь с собаками.');
    expect(entries[1].body).not.toMatch(/^Охота без собак/m); // not a plain paragraph
  });
});

describe('convertWork epigraph declared before its story heading', () => {
  const work = {
    id: 'demo4', title: 'Демо4', single_page: false, strip: [],
    stories: [
      { slug: 'pismo', title: 'Письмо', untitled: true, kind: 'story' },
      { slug: 'noch', title: 'Ночь', kind: 'story', epigraph: 'Один рыбак рассказал историю!' },
    ],
  };
  const src = [
    '   Текст письма.',
    '',
    '   Один рыбак рассказал историю\\!', // epigraph for "noch" but sits before its heading
    '',
    '        НОЧЬ.',
    '',
    '   Текст про ночь.',
    '',
  ].join('\n');
  const entries = convertWork(src, work);
  const pismo = entries.find((e) => e.slug === 'pismo');
  const noch = entries.find((e) => e.slug === 'noch');

  it('removes the preface from the preceding story', () => {
    expect(pismo.body).not.toContain('рыбак');
  });
  it('attaches it as the epigraph at the top of the owning story', () => {
    expect(noch.body).toContain('> Один рыбак рассказал историю!');
    expect(noch.body.indexOf('> Один рыбак')).toBeLessThan(noch.body.indexOf('Текст про ночь.'));
  });
});

describe('convertWork single_page: work epigraphs + section heading level', () => {
  const work = {
    id: 'nov2', title: 'Повесть2', single_page: true, strip: [],
    epigraphs: ['Посвящаю охотникам!'],
    stories: [
      { slug: 'glava-pervaya', title: 'Глава первая', kind: 'chapter' },
      { slug: 'epilog', title: 'Капитанская дочка', kind: 'section' },
    ],
  };
  const src = [
    '   Посвящаю охотникам\\!',
    '',
    '   Вступление.',
    '',
    '        ГЛАВА ПЕРВАЯ.',
    '',
    '   Текст главы.',
    '',
    '        КАПИТАНСКАЯ ДОЧКА.',
    '',
    '   Закрытие.',
    '',
  ].join('\n');
  const [entry] = convertWork(src, work);

  it('wraps a work-level epigraph as a blockquote at the top', () => {
    expect(entry.body).toContain('> Посвящаю охотникам!');
    expect(entry.body.indexOf('> Посвящаю')).toBeLessThan(entry.body.indexOf('Вступление.'));
  });
  it('renders a chapter as ## and a non-chapter section as ###', () => {
    expect(entry.body).toMatch(/^## Глава первая$/m);
    expect(entry.body).toMatch(/^### Капитанская дочка$/m);
    expect(entry.body).not.toMatch(/^## Капитанская дочка$/m); // not an h2 chapter
  });
});

describe('convertWork colophon (signature / postscript)', () => {
  it('wraps declared colophon lines in <p class="colophon">, not plain paragraphs', () => {
    const work = {
      id: 'demo5', title: 'Демо5', single_page: false, strip: [],
      stories: [
        { slug: 'a', title: 'A', untitled: true, kind: 'story',
          colophon: ['Виталий Ворушин. май 2024 года.', 'В мае 1974 года я вернулся.'] },
      ],
    };
    const src = [
      '   Текст рассказа.',
      '',
      '   Виталий Ворушин. май 2024 года.',
      '   В мае 1974 года я вернулся.',
      '',
    ].join('\n');
    const [entry] = convertWork(src, work);
    expect(entry.body).toContain('<p class="colophon">Виталий Ворушин. май 2024 года.</p>');
    expect(entry.body).toContain('<p class="colophon">В мае 1974 года я вернулся.</p>');
    expect(entry.body).toContain('Текст рассказа.');
  });

  it('supports work-level colophon for single_page works', () => {
    const work = {
      id: 'nov3', title: 'Повесть3', single_page: true, strip: [],
      colophon: ['Биолог-охотовед Виталий Ворушин.'],
      stories: [{ slug: 'glava-pervaya', title: 'Глава первая', kind: 'chapter' }],
    };
    const src = ['        ГЛАВА ПЕРВАЯ.', '', '   Текст.', '', '   Биолог-охотовед Виталий Ворушин.', ''].join('\n');
    const [entry] = convertWork(src, work);
    expect(entry.body).toContain('<p class="colophon">Биолог-охотовед Виталий Ворушин.</p>');
  });
});

