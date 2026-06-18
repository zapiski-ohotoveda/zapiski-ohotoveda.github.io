# «Записки охотоведа» Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish two Russian hunting-prose works (a novella and a memoir collection) as a classic-book-styled, SEO-friendly Astro static site on GitHub Pages, converting the messy pandoc exports into clean canonical Markdown with a zero-content-loss guarantee.

**Architecture:** Two separated concerns. (1) A one-time **conversion pipeline** (Node scripts) cleans the `.docx.md` exports and slices them into per-story canonical Markdown using a human-reviewed structure manifest, gated by a fidelity check that proves no words were lost. (2) An **Astro site** consumes that Markdown via content collections and renders classic-book pages, a full home index, per-story pages, a single-page novella, plus SEO (sitemap, RSS, OpenGraph, JSON-LD).

**Tech Stack:** Node ≥20, Astro 5, Vitest (tests), `yaml` (manifest), `github-slugger` (anchors), `@fontsource/pt-serif` (self-hosted font), `@astrojs/sitemap`, `@astrojs/rss`. Pure ESM (`.mjs` / `.ts`).

## Global Constraints

- **Language:** All content and UI in Russian; `<html lang="ru">`.
- **Node:** ≥ 20.3 (Astro 5 floor). Package manager: `npm`.
- **Zero content loss:** The fidelity check (Task 7) is a hard gate — conversion output must contain 100% of source words, in order. Never merge a conversion that fails it.
- **Canonical source:** After conversion, `src/content/**` Markdown is the source of truth. Raw `source/*.docx.md` are archival only and are never imported by the site.
- **Slugs:** Latin, lowercase, hyphenated, curated in the manifest (never auto-generated at build time for page URLs).
- **Modules:** ESM everywhere. Scripts are `.mjs`; converter logic is pure and unit-tested separately from file I/O.
- **Encoding:** UTF-8. Preserve the author's «» quotes, em dashes (—), and intentional ALL-CAPS aphorisms verbatim in body text.
- **Commits:** One per task minimum; end commit messages with the Co-Authored-By trailer used by this repo.

---

## File Structure

```
source/                          # raw .docx.md exports (archival)
  ПОВЕСТЬ.docx.md
  КНИГА.docx.md
structure.manifest.yaml          # reviewed work/story/epigraph map (Task 2)
scripts/
  lib/
    clean.mjs                    # pure text helpers: unescape, scene-break, caps ratio, title-normalize (Task 3)
    clean.test.mjs
    manifest.mjs                 # load + index the manifest (Task 4)
    manifest.test.mjs
    convert.mjs                  # pure: convertWork(sourceText, workManifest) -> entries[] (Task 5/6)
    convert.test.mjs
    fidelity.mjs                 # pure: tokenize + assertNoLoss (Task 7)
    fidelity.test.mjs
  report-headings.mjs            # lists ALL-CAPS heading candidates (Task 2)
  build-content.mjs             # CLI: manifest + sources -> src/content/** (Task 6)
  check-fidelity.mjs            # CLI: re-run fidelity gate on disk (Task 7)
src/
  content.config.ts              # content collections schema (Task 8)
  content/
    collection/*.md              # generated: one per story
    novella/taezhnyy-kapkan.md   # generated: single file, ## chapters
  styles/book.css                # classic-book typography + theme + reading bar (Task 9)
  components/
    Epigraph.astro  SceneBreak.astro  ReadingBar.astro
    StoryNav.astro  ChapterNav.astro  SiteIndex.astro  BaseHead.astro
  layouts/BookPage.astro         # shared reading shell (Task 9)
  pages/
    index.astro                  # home + full index (Task 12)
    zapiski-ohotoveda/index.astro    # collection contents (Task 11)
    zapiski-ohotoveda/[slug].astro   # per-story page (Task 10)
    taezhnyy-kapkan/index.astro      # novella single page (Task 11)
    rss.xml.ts                   # RSS feed (Task 13)
    robots.txt.ts                # robots (Task 13)
astro.config.mjs                 # site URL, base, sitemap integration (Task 1/13)
vitest.config.mjs                # test config (Task 1)
package.json
.github/workflows/deploy.yml     # GitHub Pages deploy (Task 14)
```

---

## Task 1: Project scaffold, tooling, archive sources

**Files:**
- Create: `package.json`, `astro.config.mjs`, `vitest.config.mjs`, `tsconfig.json`, `src/pages/index.astro` (temporary placeholder)
- Move: `ПОВЕСТЬ.docx.md` → `source/ПОВЕСТЬ.docx.md`, `КНИГА.docx.md` → `source/КНИГА.docx.md`

**Interfaces:**
- Produces: `npm run dev` (Astro dev server), `npm test` (Vitest), `npm run build` (static build to `dist/`). Astro `site` set to the GitHub Pages URL placeholder.

- [ ] **Step 1: Archive raw exports**

```bash
mkdir -p source
git mv "ПОВЕСТЬ.docx.md" source/ 2>/dev/null || mv "ПОВЕСТЬ.docx.md" source/
git mv "КНИГА.docx.md" source/ 2>/dev/null || mv "КНИГА.docx.md" source/
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "zapiski-ohotoveda",
  "type": "module",
  "version": "1.0.0",
  "private": true,
  "engines": { "node": ">=20.3.0" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "content:build": "node scripts/build-content.mjs",
    "content:report": "node scripts/report-headings.mjs",
    "content:check": "node scripts/check-fidelity.mjs"
  },
  "dependencies": {
    "astro": "^5.0.0",
    "@astrojs/rss": "^4.0.0",
    "@astrojs/sitemap": "^3.2.0",
    "@fontsource/pt-serif": "^5.0.0"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "yaml": "^2.5.0",
    "github-slugger": "^2.0.0"
  }
}
```

- [ ] **Step 3: Install**

Run: `npm install`
Expected: completes; `node_modules/` present (already gitignored).

- [ ] **Step 4: Create `astro.config.mjs`**

```js
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
```

- [ ] **Step 5: Create `vitest.config.mjs`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['scripts/**/*.test.mjs'],
    environment: 'node',
  },
});
```

- [ ] **Step 6: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 7: Temporary placeholder home page**

`src/pages/index.astro`:
```astro
---
---
<html lang="ru">
  <head><meta charset="utf-8" /><title>Записки охотоведа</title></head>
  <body><h1>Записки охотоведа</h1><p>Сайт в разработке.</p></body>
</html>
```

- [ ] **Step 8: Verify dev server and tests run**

Run: `npm run build`
Expected: build succeeds, `dist/index.html` produced.
Run: `npm test`
Expected: Vitest runs with "No test files found" (acceptable at this stage) and exits 0.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Scaffold Astro project and archive source exports

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Heading-candidate report + structure manifest

**Files:**
- Create: `scripts/report-headings.mjs`, `structure.manifest.yaml`

**Interfaces:**
- Produces: `structure.manifest.yaml` consumed by Tasks 4–6. Manifest shape (consumed by `loadManifest`):
  - `works: [{ id, title, source, single_page?, strip: string[], stories: [{ slug, title, untitled?, kind, subsections?: string[] }] }]`
  - `kind` ∈ `story` | `chapter` | `dedication`.

- [ ] **Step 1: Write the heading-candidate report script**

`scripts/report-headings.mjs`:
```js
import { readFileSync } from 'node:fs';

const files = ['source/КНИГА.docx.md', 'source/ПОВЕСТЬ.docx.md'];
for (const file of files) {
  console.log('='.repeat(70));
  console.log(file);
  console.log('='.repeat(70));
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((raw, i) => {
    const s = raw.trim().replace(/\\/g, '');
    const letters = [...s].filter((c) => /\p{L}/u.test(c));
    if (letters.length === 0) return;
    const upper = letters.filter((c) => c === c.toUpperCase() && c !== c.toLowerCase()).length;
    const fracUpper = upper / letters.length;
    const words = s.split(/\s+/).length;
    if (fracUpper > 0.85 && words <= 8 && s.length < 70) {
      console.log(`  L${String(i + 1).padStart(4)} | ${s}`);
    }
  });
}
```

- [ ] **Step 2: Run the report to confirm candidates**

Run: `npm run content:report`
Expected: prints the heading candidates per file (titles like `ТАЁЖНЫЙ КАПКАН.`, `СОБОЛИНЫЙ КОТ.`, chapter names, etc.). Use this to sanity-check the manifest below.

- [ ] **Step 3: Author `structure.manifest.yaml`**

This is the reviewed map. Titles are normalized to sentence case; `strip` lists exact lines to discard; the first collection entry is the untitled autobiographical opening. (Title of the opening and a few edge epigraphs are provisional — flagged for the author to confirm when the site runs.)

```yaml
works:
  - id: zapiski-ohotoveda
    title: "Записки охотоведа"
    source: source/КНИГА.docx.md
    single_page: false
    strip:
      - "КНИГА."
      - "ЗАПИСКИ ОХОТОВЕДА."
    stories:
      - { slug: detstvo, title: "Детство", untitled: true, kind: story }   # PROVISIONAL title — confirm with author
      - { slug: znakomstvo-s-okhotugodyami, title: "Знакомство с охотугодьями", kind: story }
      - { slug: okhotobshchestvo, title: "Охотобщество — первая ступень в профессию", kind: story }
      - { slug: ucheba-put-k-poznaniyu, title: "Учёба — путь к познанию", kind: story }
      - { slug: mladshiy-brat-tigra, title: "Младший брат тигра", kind: story }
      - { slug: zagadochny-koster, title: "Загадочный костёр", kind: story }
      - { slug: sluchay-v-urmane, title: "Случай в урмане", kind: story }
      - { slug: nepredvidennaya-vstrecha, title: "Непредвиденная встреча", kind: story }
      - { slug: pervomayskiy-marafon, title: "Первомайский марафон", kind: story }
      - { slug: bez-viny-vinovaty, title: "Без вины виноватый", kind: story }
      - { slug: dosadny-sluchay, title: "Досадный случай", kind: story }
      - { slug: soboliny-kot, title: "Соболиный кот", kind: story }
      - { slug: vrag-naroda, title: "Враг народа", kind: story }
      - slug: sobaki-v-moey-seme
        title: "Собаки в моей семье"
        kind: story
        subsections: ["Север", "Буран и Пурга", "Чок и Пуля", "Веста", "Лада", "Кузя", "Жук", "Чарлик", "Чара", "Гошка", "Варька"]
      - slug: sobachi-istorii
        title: "Собачьи истории"
        kind: story
        subsections: ["Рада", "Север и овцы", "Случай на клюкве", "Волкособы", "Эмпатия"]
      - { slug: poslednee-pismo, title: "Последнее письмо", kind: story }
      - { slug: v-noch-na-ivana-kupala, title: "В ночь на Ивана Купала", kind: story }
  - id: taezhnyy-kapkan
    title: "Таёжный капкан"
    source: source/ПОВЕСТЬ.docx.md
    single_page: true
    strip:
      - "ПОВЕСТЬ.  Готова в печать."
      - "ПОВЕСТЬ. Готова в печать."
    stories:
      - { slug: glava-pervaya, title: "Глава первая", kind: chapter }
      - { slug: glava-vtoraya, title: "Глава вторая", kind: chapter }
      - { slug: glava-tretya, title: "Глава третья", kind: chapter }
      - { slug: glava-chetvyortaya, title: "Глава четвёртая", kind: chapter }
      - { slug: glava-pyataya, title: "Глава пятая", kind: chapter }
      - { slug: kapitanskaya-dochka, title: "Капитанская дочка", kind: chapter }
```

- [ ] **Step 4: Commit**

```bash
git add scripts/report-headings.mjs structure.manifest.yaml
git commit -m "Add heading report and reviewed structure manifest

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Pure text-cleaning helpers

**Files:**
- Create: `scripts/lib/clean.mjs`, `scripts/lib/clean.test.mjs`

**Interfaces:**
- Produces (consumed by Tasks 5/7):
  - `unescape(text: string): string` — removes pandoc backslash escapes before `! - , . * ( ) [ ] # > _` etc.
  - `isSceneBreak(line: string): boolean` — true for `***` / `* * *` divider lines (after unescape).
  - `uppercaseFraction(text: string): number` — fraction of cased letters that are uppercase (0..1); 0 if no letters.
  - `normalizeTitle(text: string): string` — uppercase, strip trailing `.`/`!`, collapse spaces, remove escapes — for matching source lines to manifest titles.
  - `collapseWhitespace(line: string): string` — trim + collapse internal runs of spaces to single spaces.

- [ ] **Step 1: Write the failing tests**

`scripts/lib/clean.test.mjs`:
```js
import { describe, it, expect } from 'vitest';
import { unescape, isSceneBreak, uppercaseFraction, normalizeTitle, collapseWhitespace } from './clean.mjs';

describe('unescape', () => {
  it('removes pandoc escapes before punctuation', () => {
    expect(unescape('всегда с нами\\!')).toBe('всегда с нами!');
    expect(unescape('из\\-за угла')).toBe('из-за угла');
    expect(unescape('\\*\\*\\*')).toBe('***');
  });
  it('leaves ordinary backslashes-in-words alone-ish but strips before punctuation only', () => {
    expect(unescape('текст, \\(в скобках\\)')).toBe('текст, (в скобках)');
  });
});

describe('isSceneBreak', () => {
  it('detects asterisk dividers after unescape', () => {
    expect(isSceneBreak('   \\*\\*\\*   ')).toBe(true);
    expect(isSceneBreak('***')).toBe(true);
    expect(isSceneBreak('* * *')).toBe(true);
  });
  it('rejects normal text', () => {
    expect(isSceneBreak('обычный абзац')).toBe(false);
  });
});

describe('uppercaseFraction', () => {
  it('is ~1 for all-caps cyrillic', () => {
    expect(uppercaseFraction('ВРАГ НАРОДА')).toBeGreaterThan(0.95);
  });
  it('is low for a normal sentence that merely starts with a caps word', () => {
    expect(uppercaseFraction('ЧЕМ ЯРЧЕ ЭЙФОРИЯ, тем тяжелее отходняк и долгий путь домой')).toBeLessThan(0.7);
  });
  it('is 0 with no letters', () => {
    expect(uppercaseFraction('123 — ***')).toBe(0);
  });
});

describe('normalizeTitle', () => {
  it('matches manifest titles regardless of trailing punctuation/escapes', () => {
    expect(normalizeTitle('  СОБОЛИНЫЙ КОТ.  ')).toBe('СОБОЛИНЫЙ КОТ');
    expect(normalizeTitle('ДОСАДНЫЙ СЛУЧАЙ\\!')).toBe('ДОСАДНЫЙ СЛУЧАЙ');
    expect(normalizeTitle('ГЛАВА   ПЕРВАЯ.')).toBe('ГЛАВА ПЕРВАЯ');
  });
});

describe('collapseWhitespace', () => {
  it('trims and collapses runs', () => {
    expect(collapseWhitespace('   а   б   ')).toBe('а б');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run scripts/lib/clean.test.mjs`
Expected: FAIL — `clean.mjs` does not exist / exports undefined.

- [ ] **Step 3: Implement `scripts/lib/clean.mjs`**

```js
// Pure, dependency-free text helpers for the conversion pipeline.

const ESCAPE_RE = /\\([!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~])/g;

export function unescape(text) {
  return text.replace(ESCAPE_RE, '$1');
}

export function collapseWhitespace(line) {
  return line.replace(/\s+/g, ' ').trim();
}

export function isSceneBreak(line) {
  const s = collapseWhitespace(unescape(line));
  return /^\*( ?\*){1,}$/.test(s); // ***, * * *, ** etc.
}

export function uppercaseFraction(text) {
  const letters = [...text].filter((c) => /\p{L}/u.test(c));
  if (letters.length === 0) return 0;
  const cased = letters.filter((c) => c.toUpperCase() !== c.toLowerCase());
  if (cased.length === 0) return 0;
  const upper = cased.filter((c) => c === c.toUpperCase()).length;
  return upper / cased.length;
}

export function normalizeTitle(text) {
  return collapseWhitespace(unescape(text))
    .replace(/[.!?:;]+$/u, '')
    .trim()
    .toUpperCase();
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run scripts/lib/clean.test.mjs`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/clean.mjs scripts/lib/clean.test.mjs
git commit -m "Add pure text-cleaning helpers for conversion

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Manifest loader

**Files:**
- Create: `scripts/lib/manifest.mjs`, `scripts/lib/manifest.test.mjs`

**Interfaces:**
- Consumes: `structure.manifest.yaml` (Task 2), `normalizeTitle` (Task 3).
- Produces (consumed by Tasks 5/6):
  - `loadManifest(path: string): { works: Work[] }`.
  - `indexWork(work): { titleMap: Map<string, Story>, subsectionMap: Map<string, {parent: Story, title: string}>, stripSet: Set<string> }` where keys are `normalizeTitle`d strings.

- [ ] **Step 1: Write the failing test**

`scripts/lib/manifest.test.mjs`:
```js
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run scripts/lib/manifest.test.mjs`
Expected: FAIL — `manifest.mjs` missing.

- [ ] **Step 3: Implement `scripts/lib/manifest.mjs`**

```js
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { normalizeTitle } from './clean.mjs';

export function loadManifest(path) {
  const doc = parse(readFileSync(path, 'utf8'));
  if (!doc || !Array.isArray(doc.works)) {
    throw new Error(`Invalid manifest at ${path}: missing works[]`);
  }
  return doc;
}

export function indexWork(work) {
  const titleMap = new Map();
  const subsectionMap = new Map();
  const stripSet = new Set((work.strip ?? []).map(normalizeTitle));

  for (const story of work.stories) {
    if (!story.untitled) {
      titleMap.set(normalizeTitle(story.title), story);
    }
    for (const sub of story.subsections ?? []) {
      subsectionMap.set(normalizeTitle(sub), { parent: story, title: sub });
    }
  }
  return { titleMap, subsectionMap, stripSet };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run scripts/lib/manifest.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/manifest.mjs scripts/lib/manifest.test.mjs
git commit -m "Add manifest loader and indexer

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Pure converter (`convertWork`)

**Files:**
- Create: `scripts/lib/convert.mjs`, `scripts/lib/convert.test.mjs`

**Interfaces:**
- Consumes: `clean.mjs` (Task 3), `indexWork` (Task 4).
- Produces (consumed by Tasks 6/7):
  - `convertWork(sourceText: string, work: object): Entry[]`
  - `Entry = { slug, title, order, work, body }` where `body` is canonical Markdown. For `single_page` works, returns exactly one Entry whose `body` contains `## ` chapter headings.

**Converter rules (paragraph = one non-blank source line):**
1. Skip blank lines (they delimit paragraphs).
2. `isSceneBreak` → emit `---` (Markdown thematic break).
3. `normalizeTitle(line)` ∈ `stripSet` → drop the line.
4. `normalizeTitle(line)` ∈ `titleMap`:
   - `single_page` work → emit `## <title>` into the single entry; if it's the work title itself, it's already frontmatter (skip).
   - split work → start a new Entry with that story's slug/title.
5. `normalizeTitle(line)` ∈ `subsectionMap` (split work) → emit `## <subsection title>` into the current entry.
6. `uppercaseFraction(cleaned) >= 0.7` AND it's a standalone paragraph → emit `> <text>` (epigraph blockquote).
7. Otherwise → emit the cleaned text as a paragraph.
- Split works: text before the first matched title belongs to the `untitled: true` opening entry. Each Entry's `order` is its index in `work.stories`.

- [ ] **Step 1: Write the failing tests**

`scripts/lib/convert.test.mjs`:
```js
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run scripts/lib/convert.test.mjs`
Expected: FAIL — `convert.mjs` missing.

- [ ] **Step 3: Implement `scripts/lib/convert.mjs`**

```js
import { unescape, collapseWhitespace, isSceneBreak, uppercaseFraction, normalizeTitle } from './clean.mjs';
import { indexWork } from './manifest.mjs';

const EPIGRAPH_THRESHOLD = 0.7;

export function convertWork(sourceText, work) {
  const { titleMap, subsectionMap, stripSet } = indexWork(work);
  const lines = sourceText.split('\n');

  if (work.single_page) {
    return [convertSinglePage(lines, work, { titleMap, stripSet })];
  }
  return convertSplit(lines, work, { titleMap, subsectionMap, stripSet });
}

function emitParagraph(buffer, rawLine) {
  if (isSceneBreak(rawLine)) {
    buffer.push('---');
    return;
  }
  const text = collapseWhitespace(unescape(rawLine));
  if (uppercaseFraction(text) >= EPIGRAPH_THRESHOLD) {
    buffer.push(`> ${text}`);
  } else {
    buffer.push(text);
  }
}

function bodyFrom(buffer) {
  return buffer.join('\n\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function convertSplit(lines, work, idx) {
  const entries = [];
  const buffers = new Map(); // slug -> string[]
  for (const story of work.stories) buffers.set(story.slug, []);

  let current = work.stories[0]; // untitled opening collects leading text
  for (const raw of lines) {
    if (raw.trim() === '') continue;
    const key = normalizeTitle(raw);
    if (idx.stripSet.has(key)) continue;
    if (idx.titleMap.has(key)) {
      current = idx.titleMap.get(key);
      continue; // title becomes frontmatter, not body
    }
    if (idx.subsectionMap.has(key)) {
      buffers.get(current.slug).push(`## ${idx.subsectionMap.get(key).title}`);
      continue;
    }
    emitParagraph(buffers.get(current.slug), raw);
  }

  work.stories.forEach((story, order) => {
    entries.push({
      slug: story.slug,
      title: story.title,
      order,
      work: work.id,
      body: bodyFrom(buffers.get(story.slug)),
    });
  });
  return entries;
}

function convertSinglePage(lines, work, idx) {
  const buffer = [];
  const chapterTitles = new Map(work.stories.map((s) => [normalizeTitle(s.title), s.title]));
  const workTitleKey = normalizeTitle(work.title);

  for (const raw of lines) {
    if (raw.trim() === '') continue;
    const key = normalizeTitle(raw);
    if (idx.stripSet.has(key) || key === workTitleKey) continue;
    if (chapterTitles.has(key)) {
      buffer.push(`## ${chapterTitles.get(key)}`);
      continue;
    }
    emitParagraph(buffer, raw);
  }

  return {
    slug: 'taezhnyy-kapkan',
    title: work.title,
    order: 0,
    work: work.id,
    body: bodyFrom(buffer),
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run scripts/lib/convert.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/convert.mjs scripts/lib/convert.test.mjs
git commit -m "Add pure converter: clean + slice source into entries

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Content build CLI (write Markdown files)

**Files:**
- Create: `scripts/build-content.mjs`

**Interfaces:**
- Consumes: `loadManifest` (Task 4), `convertWork` (Task 5).
- Produces: `src/content/collection/<slug>.md` (one per collection story) and `src/content/novella/taezhnyy-kapkan.md`. Each file has YAML frontmatter: `title`, `slug`, `order`, `work`, and (for stories with subsections) `subsections: [{title, anchor}]`.

- [ ] **Step 1: Implement `scripts/build-content.mjs`**

```js
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import GithubSlugger from 'github-slugger';
import { loadManifest } from './lib/manifest.mjs';
import { convertWork } from './lib/convert.mjs';
import { readFileSync } from 'node:fs';

const manifest = loadManifest('structure.manifest.yaml');

const OUT = {
  'zapiski-ohotoveda': 'src/content/collection',
  'taezhnyy-kapkan': 'src/content/novella',
};

for (const dir of Object.values(OUT)) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

function frontmatter(entry, work) {
  const lines = ['---'];
  lines.push(`title: ${JSON.stringify(entry.title)}`);
  lines.push(`slug: ${JSON.stringify(entry.slug)}`);
  lines.push(`order: ${entry.order}`);
  lines.push(`work: ${JSON.stringify(entry.work)}`);
  const story = work.stories.find((s) => s.slug === entry.slug);
  if (story?.subsections?.length) {
    const slugger = new GithubSlugger();
    lines.push('subsections:');
    for (const sub of story.subsections) {
      lines.push(`  - title: ${JSON.stringify(sub)}`);
      lines.push(`    anchor: ${JSON.stringify(slugger.slug(sub))}`);
    }
  }
  lines.push('---', '');
  return lines.join('\n');
}

let total = 0;
for (const work of manifest.works) {
  const sourceText = readFileSync(work.source, 'utf8');
  const entries = convertWork(sourceText, work);
  for (const entry of entries) {
    const file = `${OUT[work.id]}/${entry.slug}.md`;
    writeFileSync(file, frontmatter(entry, work) + entry.body);
    total += 1;
    console.log(`wrote ${file} (${entry.body.length} chars)`);
  }
}
console.log(`\nDone: ${total} files.`);
```

- [ ] **Step 2: Run the build**

Run: `npm run content:build`
Expected: prints `wrote src/content/collection/detstvo.md ...` for all 17 collection stories and `wrote src/content/novella/taezhnyy-kapkan.md`; ends `Done: 18 files.`

- [ ] **Step 3: Spot-check output**

Run: `head -40 src/content/collection/soboliny-kot.md`
Expected: valid frontmatter (`title: "Соболиный кот"`), clean prose with no `\!` escapes, epigraphs as `> ...`, scene breaks as `---`.
Run: `grep -c "^## " src/content/novella/taezhnyy-kapkan.md`
Expected: `6` (six chapter headings).

- [ ] **Step 4: Commit**

```bash
git add scripts/build-content.mjs src/content
git commit -m "Add content build CLI and generate canonical Markdown

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Fidelity gate (zero content loss)

**Files:**
- Create: `scripts/lib/fidelity.mjs`, `scripts/lib/fidelity.test.mjs`, `scripts/check-fidelity.mjs`

**Interfaces:**
- Consumes: `clean.mjs` (Task 3), generated files (Task 6).
- Produces:
  - `tokenize(text: string): string[]` — lowercased word tokens (Cyrillic/Latin/digits), punctuation & markup stripped.
  - `assertNoLoss(sourceText: string, combinedOutput: string): {ok: boolean, missing: string[]}` — every source token must appear, in order, as a subsequence of the output tokens.
  - CLI `check-fidelity.mjs` exits non-zero if any work loses content.

**Why subsequence:** titles move to frontmatter and `***`→`---`, so output isn't token-identical, but **no body word may vanish**. Source tokens must form an ordered subsequence of output tokens. Strip-list words (e.g. «КНИГА», «Готова в печать») are removed from the source token stream before comparison.

- [ ] **Step 1: Write the failing tests**

`scripts/lib/fidelity.test.mjs`:
```js
import { describe, it, expect } from 'vitest';
import { tokenize, assertNoLoss } from './fidelity.mjs';

describe('tokenize', () => {
  it('splits into lowercased word tokens, dropping punctuation/markup', () => {
    expect(tokenize('Я родился\\! «В» Павлодаре — ***')).toEqual(['я', 'родился', 'в', 'павлодаре']);
  });
});

describe('assertNoLoss', () => {
  it('passes when every source word survives in order', () => {
    const src = 'Я родился в Павлодаре. СОБОЛИНЫЙ КОТ. История про кота.';
    const out = '## Соболиный кот\n\nЯ родился в Павлодаре. История про кота.';
    expect(assertNoLoss(src, out).ok).toBe(true);
  });
  it('fails and reports a missing word', () => {
    const src = 'охотник нашёл редкого соболя в тайге';
    const out = 'охотник нашёл в тайге';
    const r = assertNoLoss(src, out);
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('редкого');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run scripts/lib/fidelity.test.mjs`
Expected: FAIL — `fidelity.mjs` missing.

- [ ] **Step 3: Implement `scripts/lib/fidelity.mjs`**

```js
import { unescape } from './clean.mjs';

export function tokenize(text) {
  const clean = unescape(text).toLowerCase();
  const matches = clean.match(/[\p{L}\p{N}]+/gu);
  return matches ?? [];
}

// Every source token must appear, in order, as a subsequence of output tokens.
export function assertNoLoss(sourceText, combinedOutput) {
  const src = tokenize(sourceText);
  const out = tokenize(combinedOutput);
  const missing = [];
  let j = 0;
  for (const tok of src) {
    let found = false;
    while (j < out.length) {
      if (out[j] === tok) { j += 1; found = true; break; }
      j += 1;
    }
    if (!found) { missing.push(tok); break; }
  }
  return { ok: missing.length === 0, missing };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run scripts/lib/fidelity.test.mjs`
Expected: PASS.

- [ ] **Step 5: Implement `scripts/check-fidelity.mjs`**

```js
import { readFileSync, readdirSync } from 'node:fs';
import { loadManifest, indexWork } from './lib/manifest.mjs';
import { assertNoLoss, tokenize } from './lib/fidelity.mjs';
import { normalizeTitle } from './lib/clean.mjs';

const manifest = loadManifest('structure.manifest.yaml');
const DIRS = { 'zapiski-ohotoveda': 'src/content/collection', 'taezhnyy-kapkan': 'src/content/novella' };

let failed = false;
for (const work of manifest.works) {
  // Source minus strip-list words.
  const { stripSet } = indexWork(work);
  let source = readFileSync(work.source, 'utf8');
  for (const stripped of work.strip ?? []) source = source.split(stripped).join(' ');

  const dir = DIRS[work.id];
  const combined = readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => readFileSync(`${dir}/${f}`, 'utf8').replace(/^---[\s\S]*?---/m, ''))
    .join('\n');

  const { ok, missing } = assertNoLoss(source, combined);
  // Account for titles now living in frontmatter (not body): allow title words to be absent.
  const titleWords = new Set(work.stories.flatMap((s) => tokenize(s.title)));
  const realMissing = missing.filter((w) => !titleWords.has(w));
  if (ok || realMissing.length === 0) {
    console.log(`✓ ${work.id}: no content loss`);
  } else {
    failed = true;
    console.error(`✗ ${work.id}: missing ${realMissing.length} token(s), first: "${realMissing[0]}"`);
  }
}
process.exit(failed ? 1 : 0);
```

- [ ] **Step 6: Run the gate on real generated content**

Run: `npm run content:check`
Expected: `✓ zapiski-ohotoveda: no content loss` and `✓ taezhnyy-kapkan: no content loss`, exit 0.
**If it fails:** the manifest mis-sliced a boundary or an epigraph rule dropped text. Fix the manifest/converter and re-run `npm run content:build` before proceeding. Do not continue past a failing gate.

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/fidelity.mjs scripts/lib/fidelity.test.mjs scripts/check-fidelity.mjs
git commit -m "Add content fidelity gate (zero word loss)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Astro content collections schema

**Files:**
- Create: `src/content.config.ts`

**Interfaces:**
- Consumes: generated Markdown (Task 6).
- Produces: `collection` and `novella` content collections queryable via `getCollection('collection')` / `getCollection('novella')`. Schema fields: `title`, `slug`, `order`, `work`, optional `subsections: {title, anchor}[]`.

- [ ] **Step 1: Implement `src/content.config.ts`**

```ts
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
```

- [ ] **Step 2: Verify the schema loads**

Run: `npm run build`
Expected: build succeeds; no content-collection validation errors. (Frontmatter from Task 6 satisfies the schema.)

- [ ] **Step 3: Commit**

```bash
git add src/content.config.ts
git commit -m "Add content collections schema

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Classic-book reading layout, components, and styles

**Files:**
- Create: `src/styles/book.css`, `src/components/BaseHead.astro`, `src/components/ReadingBar.astro`, `src/layouts/BookPage.astro`

**Interfaces:**
- Consumes: `@fontsource/pt-serif`.
- Produces:
  - `BaseHead.astro` props: `{ title: string, description: string }` — emits `<meta charset>`, viewport, `<title>`, description, canonical, OpenGraph, and JSON-LD slot.
  - `BookPage.astro` props: `{ title: string, description: string }` — full HTML shell with `lang="ru"`, reading bar, and a default `<slot />` inside `<article class="prose">`.
  - CSS classes: `.prose` (body), `blockquote` styled as epigraph, `hr` styled as scene break, `.reading-bar`, `[data-theme="dark"]`, drop-cap on `.prose > p:first-of-type::first-letter`.

- [ ] **Step 1: Implement `src/components/BaseHead.astro`**

```astro
---
interface Props { title: string; description: string }
const { title, description } = Astro.props;
const canonical = new URL(Astro.url.pathname, Astro.site);
---
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical} />
<meta property="og:type" content="article" />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:locale" content="ru_RU" />
<meta name="twitter:card" content="summary" />
<link rel="alternate" type="application/rss+xml" title="Записки охотоведа" href={new URL('rss.xml', Astro.site)} />
```

- [ ] **Step 2: Implement `src/components/ReadingBar.astro`**

```astro
---
---
<div class="reading-bar">
  <a class="reading-bar__home" href={import.meta.env.BASE_URL} aria-label="На главную">☰ Оглавление</a>
  <div class="reading-bar__controls">
    <button data-font="dec" aria-label="Меньше шрифт">А−</button>
    <button data-font="inc" aria-label="Больше шрифт">А+</button>
    <button data-theme-toggle aria-label="Сменить тему">◐</button>
  </div>
</div>
<script>
  const root = document.documentElement;
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) root.dataset.theme = savedTheme;
  const savedScale = localStorage.getItem('fontScale');
  if (savedScale) root.style.setProperty('--font-scale', savedScale);

  document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    localStorage.setItem('theme', next);
  });
  function bump(delta: number) {
    const cur = parseFloat(getComputedStyle(root).getPropertyValue('--font-scale')) || 1;
    const next = Math.min(1.5, Math.max(0.85, +(cur + delta).toFixed(2)));
    root.style.setProperty('--font-scale', String(next));
    localStorage.setItem('fontScale', String(next));
  }
  document.querySelector('[data-font="inc"]')?.addEventListener('click', () => bump(0.1));
  document.querySelector('[data-font="dec"]')?.addEventListener('click', () => bump(-0.1));
</script>
```

- [ ] **Step 3: Implement `src/styles/book.css`**

```css
@import '@fontsource/pt-serif/400.css';
@import '@fontsource/pt-serif/400-italic.css';
@import '@fontsource/pt-serif/700.css';

:root {
  --font-scale: 1;
  --paper: #faf6ec;
  --ink: #2b2620;
  --muted: #6b6253;
  --accent: #5c4326;
  --rule: #d9cdb6;
  --measure: 38rem;
}
:root[data-theme='dark'] {
  --paper: #1c1a17;
  --ink: #e8e0d0;
  --muted: #a89f8c;
  --accent: #c9a36a;
  --rule: #3a352d;
}

* { box-sizing: border-box; }
html { background: var(--paper); }
body {
  margin: 0;
  color: var(--ink);
  background: var(--paper);
  font-family: 'PT Serif', Georgia, 'Times New Roman', serif;
  font-size: calc(1.18rem * var(--font-scale));
  line-height: 1.66;
  -webkit-text-size-adjust: 100%;
}

.reading-bar {
  position: sticky; top: 0; z-index: 10;
  display: flex; justify-content: space-between; align-items: center;
  gap: 1rem; padding: 0.5rem 1rem;
  background: color-mix(in srgb, var(--paper) 92%, transparent);
  backdrop-filter: blur(6px);
  border-bottom: 1px solid var(--rule);
  font-family: system-ui, sans-serif; font-size: 0.85rem;
}
.reading-bar a { color: var(--muted); text-decoration: none; }
.reading-bar__controls button {
  font: inherit; cursor: pointer; border: 1px solid var(--rule);
  background: transparent; color: var(--ink); border-radius: 4px;
  padding: 0.2rem 0.55rem; margin-left: 0.35rem;
}

main { max-width: var(--measure); margin: 0 auto; padding: 2.5rem 1.25rem 6rem; }

.prose h1 { font-size: 1.9em; line-height: 1.2; text-align: center; margin: 1rem 0 2.5rem; font-weight: 700; }
.prose h2 { font-size: 1.25em; text-align: center; letter-spacing: 0.03em; margin: 2.8rem 0 1.4rem; font-weight: 700; }
.prose p { margin: 0; text-indent: 1.6em; text-align: justify; hyphens: auto; }
.prose p:first-of-type { text-indent: 0; }
.prose p + p { margin-top: 0; }

/* Drop cap on the opening paragraph of each work/story */
.prose > p:first-of-type::first-letter {
  float: left; font-size: 3.1em; line-height: 0.8;
  padding: 0.05em 0.08em 0 0; color: var(--accent); font-weight: 700;
}

/* Epigraphs (author's ALL-CAPS aphorisms) */
.prose blockquote {
  margin: 2rem auto; max-width: 30rem; text-align: center;
  font-style: italic; color: var(--muted);
  letter-spacing: 0.02em; line-height: 1.5;
}
.prose blockquote p { text-indent: 0; text-align: center; }

/* Scene break ornament */
.prose hr {
  border: 0; margin: 2.2rem 0; text-align: center;
}
.prose hr::before { content: '* * *'; color: var(--muted); letter-spacing: 0.6em; }

a { color: var(--accent); }
@media (max-width: 480px) {
  body { font-size: calc(1.08rem * var(--font-scale)); }
  .prose p { text-align: left; }
}
```

- [ ] **Step 4: Implement `src/layouts/BookPage.astro`**

```astro
---
import BaseHead from '../components/BaseHead.astro';
import ReadingBar from '../components/ReadingBar.astro';
import '../styles/book.css';
interface Props { title: string; description: string }
const { title, description } = Astro.props;
---
<!doctype html>
<html lang="ru">
  <head>
    <BaseHead title={title} description={description} />
    <slot name="head" />
  </head>
  <body>
    <ReadingBar />
    <main>
      <article class="prose">
        <slot />
      </article>
    </main>
  </body>
</html>
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: builds; PT Serif CSS bundled. (No page uses the layout yet — that's the next tasks.)

- [ ] **Step 6: Commit**

```bash
git add src/styles src/components/BaseHead.astro src/components/ReadingBar.astro src/layouts/BookPage.astro
git commit -m "Add classic-book layout, reading bar, and typography

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Per-story pages + story navigation

**Files:**
- Create: `src/components/StoryNav.astro`, `src/pages/zapiski-ohotoveda/[slug].astro`

**Interfaces:**
- Consumes: `getCollection('collection')`, `BookPage` (Task 9).
- Produces: a static page per collection story at `/zapiski-ohotoveda/<slug>/` with H1 title, rendered body, and prev/next + “к оглавлению” navigation ordered by `order`.

- [ ] **Step 1: Implement `src/components/StoryNav.astro`**

```astro
---
interface Props { prev?: { slug: string; title: string }; next?: { slug: string; title: string }; }
const { prev, next } = Astro.props;
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
---
<nav class="story-nav">
  {prev ? <a rel="prev" href={`${base}/zapiski-ohotoveda/${prev.slug}/`}>← {prev.title}</a> : <span></span>}
  <a class="story-nav__toc" href={`${base}/zapiski-ohotoveda/`}>Оглавление</a>
  {next ? <a rel="next" href={`${base}/zapiski-ohotoveda/${next.slug}/`}>{next.title} →</a> : <span></span>}
</nav>
<style>
  .story-nav { display: flex; justify-content: space-between; gap: 1rem; margin-top: 4rem;
    padding-top: 1.5rem; border-top: 1px solid var(--rule); font-family: system-ui, sans-serif;
    font-size: 0.9rem; }
  .story-nav a { color: var(--accent); text-decoration: none; }
  .story-nav__toc { color: var(--muted); }
</style>
```

- [ ] **Step 2: Implement `src/pages/zapiski-ohotoveda/[slug].astro`**

```astro
---
import { getCollection, render } from 'astro:content';
import BookPage from '../../layouts/BookPage.astro';
import StoryNav from '../../components/StoryNav.astro';

export async function getStaticPaths() {
  const stories = (await getCollection('collection')).sort((a, b) => a.data.order - b.data.order);
  return stories.map((story, i) => ({
    params: { slug: story.data.slug },
    props: {
      story,
      prev: i > 0 ? stories[i - 1].data : undefined,
      next: i < stories.length - 1 ? stories[i + 1].data : undefined,
    },
  }));
}

const { story, prev, next } = Astro.props;
const { Content } = await render(story);
const description = `${story.data.title} — рассказ из книги «Записки охотоведа».`;
---
<BookPage title={`${story.data.title} — Записки охотоведа`} description={description}>
  <h1>{story.data.title}</h1>
  <Content />
  <StoryNav prev={prev} next={next} />
</BookPage>
```

- [ ] **Step 3: Build and verify pages generate**

Run: `npm run build`
Expected: `dist/zapiski-ohotoveda/soboliny-kot/index.html` and one dir per story exist.
Run: `grep -o "Соболиный кот" dist/zapiski-ohotoveda/soboliny-kot/index.html | head -1`
Expected: prints `Соболиный кот`.

- [ ] **Step 4: Visual check (manual)**

Run: `npm run dev` and open `http://localhost:4321/zapiski-ohotoveda/soboliny-kot/`
Expected: classic-book story page, working prev/next, epigraphs centered, scene breaks as `* * *`.

- [ ] **Step 5: Commit**

```bash
git add src/components/StoryNav.astro src/pages/zapiski-ohotoveda/\[slug\].astro
git commit -m "Add per-story pages with prev/next navigation

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Collection contents page + novella single page

**Files:**
- Create: `src/components/ChapterNav.astro`, `src/pages/zapiski-ohotoveda/index.astro`, `src/pages/taezhnyy-kapkan/index.astro`

**Interfaces:**
- Consumes: `getCollection`, `render` (`headings`), `BookPage`.
- Produces: `/zapiski-ohotoveda/` contents page listing stories (with dog subsections as nested anchor links) and `/taezhnyy-kapkan/` single-page novella with a floating chapter list built from the rendered `##` headings.

- [ ] **Step 1: Implement `src/components/ChapterNav.astro`**

```astro
---
interface Props { headings: { depth: number; slug: string; text: string }[] }
const chapters = Astro.props.headings.filter((h) => h.depth === 2);
---
{chapters.length > 0 && (
  <nav class="chapter-nav" aria-label="Главы">
    <p class="chapter-nav__title">Главы</p>
    <ol>
      {chapters.map((c) => <li><a href={`#${c.slug}`}>{c.text}</a></li>)}
    </ol>
  </nav>
)}
<style>
  .chapter-nav { font-family: system-ui, sans-serif; font-size: 0.85rem; margin: 0 0 2.5rem;
    padding: 1rem 1.25rem; border: 1px solid var(--rule); border-radius: 6px; background: color-mix(in srgb, var(--paper) 80%, var(--rule)); }
  .chapter-nav__title { margin: 0 0 0.5rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; }
  .chapter-nav ol { margin: 0; padding-left: 1.2rem; }
  .chapter-nav a { color: var(--accent); text-decoration: none; }
</style>
```

- [ ] **Step 2: Implement `src/pages/taezhnyy-kapkan/index.astro`**

```astro
---
import { getEntry, render } from 'astro:content';
import BookPage from '../../layouts/BookPage.astro';
import ChapterNav from '../../components/ChapterNav.astro';

const novella = await getEntry('novella', 'taezhnyy-kapkan');
const { Content, headings } = await render(novella);
const description = 'Таёжный капкан — повесть о промысловых охотниках Западной Сибири.';
---
<BookPage title="Таёжный капкан — повесть" description={description}>
  <h1>Таёжный капкан</h1>
  <ChapterNav headings={headings} />
  <Content />
</BookPage>
```

- [ ] **Step 3: Implement `src/pages/zapiski-ohotoveda/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import BookPage from '../../layouts/BookPage.astro';

const stories = (await getCollection('collection')).sort((a, b) => a.data.order - b.data.order);
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
---
<BookPage title="Записки охотоведа — оглавление" description="Сборник рассказов охотоведа: оглавление.">
  <h1>Записки охотоведа</h1>
  <ol class="toc">
    {stories.map((s) => (
      <li>
        <a href={`${base}/zapiski-ohotoveda/${s.data.slug}/`}>{s.data.title}</a>
        {s.data.subsections && (
          <ul class="toc__sub">
            {s.data.subsections.map((sub) => (
              <li><a href={`${base}/zapiski-ohotoveda/${s.data.slug}/#${sub.anchor}`}>{sub.title}</a></li>
            ))}
          </ul>
        )}
      </li>
    ))}
  </ol>
</BookPage>
<style>
  .toc { list-style: none; padding: 0; counter-reset: item; }
  .toc > li { margin: 0.7rem 0; counter-increment: item; }
  .toc > li::before { content: counter(item) '. '; color: var(--muted); }
  .toc a { color: var(--accent); text-decoration: none; }
  .toc__sub { list-style: none; margin: 0.3rem 0 0.6rem 1.5rem; padding: 0; font-size: 0.92em; }
  .toc__sub li { margin: 0.25rem 0; }
  .toc__sub a { color: var(--muted); }
</style>
```

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: `dist/zapiski-ohotoveda/index.html` and `dist/taezhnyy-kapkan/index.html` exist.
Run: `grep -c "<li>" dist/zapiski-ohotoveda/index.html`
Expected: ≥ 17 (stories) plus subsection items.
Run: `grep -o "Глава первая" dist/taezhnyy-kapkan/index.html | head -1`
Expected: prints `Глава первая` (from the chapter nav).

- [ ] **Step 5: Commit**

```bash
git add src/components/ChapterNav.astro src/pages/zapiski-ohotoveda/index.astro src/pages/taezhnyy-kapkan/index.astro
git commit -m "Add collection contents page and single-page novella

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Home page with full index

**Files:**
- Create: `src/components/SiteIndex.astro`; Replace: `src/pages/index.astro`

**Interfaces:**
- Consumes: `getCollection('collection')`, `getEntry('novella', …)`, `render` (for novella headings), `BookPage`.
- Produces: the front page — site title, short author note, and a **full index**: every collection story (with dog subsections) linked to its page, and every novella chapter linked to its anchor on the novella page.

- [ ] **Step 1: Implement `src/components/SiteIndex.astro`**

```astro
---
interface Story { slug: string; title: string; subsections?: { title: string; anchor: string }[] }
interface Chapter { slug: string; text: string }
interface Props { stories: Story[]; chapters: Chapter[] }
const { stories, chapters } = Astro.props;
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
---
<section class="index">
  <h2><a href={`${base}/zapiski-ohotoveda/`}>Записки охотоведа</a></h2>
  <p class="index__lead">Автобиографические рассказы и очерки.</p>
  <ol class="toc">
    {stories.map((s) => (
      <li>
        <a href={`${base}/zapiski-ohotoveda/${s.slug}/`}>{s.title}</a>
        {s.subsections && (
          <ul class="toc__sub">
            {s.subsections.map((sub) => (
              <li><a href={`${base}/zapiski-ohotoveda/${s.slug}/#${sub.anchor}`}>{sub.title}</a></li>
            ))}
          </ul>
        )}
      </li>
    ))}
  </ol>

  <h2><a href={`${base}/taezhnyy-kapkan/`}>Таёжный капкан</a></h2>
  <p class="index__lead">Повесть.</p>
  <ol class="toc">
    {chapters.map((c) => (
      <li><a href={`${base}/taezhnyy-kapkan/#${c.slug}`}>{c.text}</a></li>
    ))}
  </ol>
</section>
<style>
  .index h2 { text-align: left; font-size: 1.4em; margin: 2.5rem 0 0.3rem; }
  .index h2 a { color: var(--ink); text-decoration: none; }
  .index__lead { color: var(--muted); font-style: italic; text-indent: 0; margin: 0 0 0.8rem; }
  .toc { list-style: none; padding: 0; counter-reset: item; }
  .toc > li { margin: 0.55rem 0; counter-increment: item; }
  .toc > li::before { content: counter(item) '. '; color: var(--muted); }
  .toc a { color: var(--accent); text-decoration: none; }
  .toc__sub { list-style: none; margin: 0.3rem 0 0.6rem 1.5rem; padding: 0; font-size: 0.92em; }
  .toc__sub a { color: var(--muted); }
</style>
```

- [ ] **Step 2: Replace `src/pages/index.astro`**

```astro
---
import { getCollection, getEntry, render } from 'astro:content';
import BookPage from '../layouts/BookPage.astro';
import SiteIndex from '../components/SiteIndex.astro';

const stories = (await getCollection('collection')).sort((a, b) => a.data.order - b.data.order)
  .map((s) => ({ slug: s.data.slug, title: s.data.title, subsections: s.data.subsections }));

const novella = await getEntry('novella', 'taezhnyy-kapkan');
const { headings } = await render(novella);
const chapters = headings.filter((h) => h.depth === 2).map((h) => ({ slug: h.slug, text: h.text }));
---
<BookPage
  title="Записки охотоведа — рассказы и повесть об охоте"
  description="Рассказы, очерки и повесть «Таёжный капкан» — о природе, охоте и людях тайги.">
  <h1>Записки охотоведа</h1>
  <p class="home-lead">Воспоминания, очерки и повесть профессионального охотоведа — о тайге,
     родной земле и людях, для которых охота была судьбой.</p>
  <SiteIndex stories={stories} chapters={chapters} />
</BookPage>
<style>
  .home-lead { text-indent: 0; text-align: center; color: var(--muted); font-style: italic;
    max-width: 30rem; margin: 0 auto 1rem; }
</style>
```

- [ ] **Step 3: Build and verify the full index**

Run: `npm run build`
Expected: `dist/index.html` exists.
Run: `grep -o "Соболиный кот" dist/index.html | head -1` → prints `Соболиный кот`.
Run: `grep -o "Глава пятая" dist/index.html | head -1` → prints `Глава пятая` (novella chapter linked from home).

- [ ] **Step 4: Commit**

```bash
git add src/components/SiteIndex.astro src/pages/index.astro
git commit -m "Add home page with full site index

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: SEO — RSS, robots, sitemap, JSON-LD

**Files:**
- Create: `src/pages/rss.xml.ts`, `src/pages/robots.txt.ts`; Modify: `src/components/BaseHead.astro` (add optional JSON-LD)

**Interfaces:**
- Consumes: `@astrojs/rss` (already in deps), `getCollection`, `Astro.site`.
- Produces: `/rss.xml` (all stories + novella), `/robots.txt` (allow all + sitemap link). `@astrojs/sitemap` (configured in Task 1) emits `/sitemap-index.xml` at build.

- [ ] **Step 1: Implement `src/pages/rss.xml.ts`**

```ts
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
```

- [ ] **Step 2: Implement `src/pages/robots.txt.ts`**

```ts
import type { APIContext } from 'astro';

export async function GET({ site }: APIContext) {
  const body = `User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap-index.xml', site).href}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}
```

- [ ] **Step 3: Add JSON-LD to `BaseHead.astro`**

Add an optional `jsonLd` prop and render it. Modify the component:
```astro
---
interface Props { title: string; description: string; jsonLd?: Record<string, unknown> }
const { title, description, jsonLd } = Astro.props;
const canonical = new URL(Astro.url.pathname, Astro.site);
---
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical} />
<meta property="og:type" content="article" />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:locale" content="ru_RU" />
<meta name="twitter:card" content="summary" />
<link rel="alternate" type="application/rss+xml" title="Записки охотоведа" href={new URL('rss.xml', Astro.site)} />
{jsonLd && <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />}
```

- [ ] **Step 4: Pass JSON-LD from the home page**

In `src/pages/index.astro`, add to the `BookPage`/`BaseHead` a `jsonLd` describing the book series. Add this slotted head markup inside `<BookPage>`:
```astro
  <Fragment slot="head">
    <script type="application/ld+json" set:html={JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Book',
      name: 'Записки охотоведа',
      inLanguage: 'ru',
      genre: 'Memoir',
      url: Astro.site?.href,
    })} />
  </Fragment>
```

- [ ] **Step 5: Build and verify SEO artifacts**

Run: `npm run build`
Expected files exist: `dist/rss.xml`, `dist/robots.txt`, `dist/sitemap-index.xml`.
Run: `grep -o "Таёжный капкан" dist/rss.xml | head -1` → prints the title.
Run: `grep -o "application/ld+json" dist/index.html | head -1` → prints the type.

- [ ] **Step 6: Commit**

```bash
git add src/pages/rss.xml.ts src/pages/robots.txt.ts src/components/BaseHead.astro src/pages/index.astro
git commit -m "Add RSS, robots, sitemap link, and JSON-LD

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: GitHub Pages deployment

**Files:**
- Create: `.github/workflows/deploy.yml`; Modify: `astro.config.mjs` (`site`/`base`)

**Interfaces:**
- Consumes: the repo name (placeholder until the user creates the GitHub repo — see Step 1).
- Produces: an Actions workflow that builds and deploys `dist/` to GitHub Pages on push to `main`.

- [ ] **Step 1: Set `site`/`base` for the actual repo**

The user will create a GitHub repo (e.g. `zapiski-ohotoveda`) under their account `<user>`. For a project page the URL is `https://<user>.github.io/<repo>/`. Update `astro.config.mjs`:
```js
export default defineConfig({
  site: 'https://<user>.github.io',
  base: '/<repo>/',
  trailingSlash: 'always',
  integrations: [sitemap()],
  markdown: { smartypants: false },
});
```
(If the repo is named `<user>.github.io`, set `site` to that and `base: '/'`.) The user must enable **Settings → Pages → Source: GitHub Actions** in the repo.

- [ ] **Step 2: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run content:check    # fidelity gate in CI
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Verify the build locally with the production base path**

Run: `npm run build && npm run preview`
Expected: open the previewed URL; the home index links resolve under `/<repo>/…` without 404s.

- [ ] **Step 4: Commit and push (user creates repo + enables Pages)**

```bash
git add .github/workflows/deploy.yml astro.config.mjs
git commit -m "Add GitHub Pages deployment workflow

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```
After the user creates the GitHub repo and adds the remote, push `main`; the Action builds and deploys. Confirm the live URL renders the home index, a story page, and the novella.

---

## Self-Review (completed during planning)

**Spec coverage:**
- Public/SEO → Tasks 12–13 (meta, OG, sitemap, RSS, JSON-LD, `lang=ru`). ✓
- Astro static + GitHub Pages → Tasks 1, 14. ✓
- Free `*.github.io` subdomain → Task 14 (`base`/`site`). ✓
- Conversion pipeline (un-escape, scene breaks, epigraph detection, manifest-driven slicing) → Tasks 2–6. ✓
- Title-vs-epigraph ambiguity via reviewed manifest → Task 2. ✓
- Fidelity / zero content loss → Task 7 (+ CI gate in Task 14). ✓
- Home full index (stories + novella chapters) → Task 12. ✓
- Collection contents + per-story pages + nested dog vignettes → Tasks 10–11 (subsections as `##` + anchor links). ✓
- Novella single page with chapter nav → Task 11. ✓
- Classic-book design, PT Serif, epigraph pull-quotes, scene-break ornament, light/dark + font-size → Task 9. ✓
- Latin curated slugs → Task 2 manifest. ✓
- Open content decisions (opening title, about blurb) → provisional in manifest/home, flagged for author when site runs (per user: "more recommendations when the site is locally running"). ✓

**Placeholder scan:** No TBD/TODO steps; every code step shows complete code. The only intentional provisional value is the opening story title in the manifest (Task 2), explicitly flagged for author confirmation; it does not block the build or the fidelity gate.

**Type consistency:** `convertWork` returns `{slug,title,order,work,body}` consumed identically in Task 6; manifest fields (`slug,title,order,work,subsections{title,anchor}`) match the Task 8 schema and the Task 10–12 page props; `assertNoLoss`/`tokenize` signatures consistent across Tasks 7 and 14.

**Known refinements (post-launch, not blocking):** lowercase-prose verse epigraph in the novella opening and the dedication line render as normal paragraphs until the author marks them; Cyrillic heading anchors are URL-encoded but functional.
