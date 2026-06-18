# «Записки охотоведа» — static website design

**Date:** 2026-06-18
**Status:** Approved design (pre-implementation)
**Goal:** Publish two works of Russian hunting prose, written by the author's father, as a fast, public, SEO-friendly static website that reads beautifully on desktop and phones — styled like a classic printed book.

---

## 1. Source material

Two pandoc-exported Markdown files (from Google Docs `.docx`), Russian, no embedded images:

- **`ПОВЕСТЬ.docx.md` → «Таёжный капкан»** — one novella (~13k words). Structure: a framing opening, five chapters (ГЛАВА ПЕРВАЯ–ПЯТАЯ), a named closing section («Капитанская дочка»), and a final epigraph.
- **`КНИГА.docx.md` → «Записки охотоведа»** — a memoir/collection (~29k words): an untitled autobiographical opening, then ~18 titled stories. Two of those stories (СОБАКИ В МОЕЙ СЕМЬЕ, СОБАЧЬИ ИСТОРИИ) contain **nested sub-vignettes** named after individual dogs (СЕВЕР, БУРАН и ПУРГА, ВЕСТА, …).

### Export artifacts to handle
- Escaped punctuation: `\!`, `\-`, `\,`, `\*`, etc.
- Headings rendered as centered text (leading spaces), **not** Markdown `#` headings.
- The author's signature **ALL-CAPS aphorisms** appear inline as epigraphs and are **visually indistinguishable from titles** to a script (e.g. `ДОСАДНЫЙ СЛУЧАЙ!` is a title; `ЕДИНСТВЕННАЯ НЕПРЕДСКАЗУЕМАЯ ВЕЩЬ В ОХОТЕ — НЕПРЕДСКАЗУЕМОСТЬ!` is an epigraph). → Conversion needs a human-reviewed structure map.
- Scene breaks written as `\*\*\*` lines.
- Irregular whitespace and docx first-line indents.

## 2. Decisions (locked)

| Topic | Decision |
|---|---|
| Audience | **Public** — SEO, clean per-work/per-story URLs, shareable links matter. |
| Stack | **Astro** static site generator → static HTML. |
| Hosting | **GitHub Pages**, deployed via GitHub Actions on push. |
| Domain | **Free `*.github.io` subdomain** for now; custom domain later (small change). |
| Growth | Mostly finished; new pieces/corrections added as Markdown files (via the author's son / assistant). |
| Aesthetic | **Classic book** — serif, cream paper, generous margins, epigraphs as pull-quotes. |
| Body font | **PT Serif** (excellent Cyrillic). |
| Novella layout | **One long page** with chapter sub-headings + floating chapter nav. |
| Home page | **Full index**: links to every collection story *and* every novella chapter. |

## 3. Architecture overview

Two clearly separated concerns:

1. **Migration (one-time):** convert the messy `.docx.md` exports into clean, hand-reviewed canonical Markdown. The raw exports are archived, never built.
2. **Site (steady state):** Astro builds the canonical Markdown into static HTML. Adding a new piece = add one Markdown file.

```
source/                      # raw .docx.md exports (archival, not built)
scripts/
  convert.mjs                # one-time migration: clean + slice per manifest
  fidelity-check.mjs         # asserts zero content loss after conversion
structure.manifest.yaml      # human-reviewed title/epigraph/level map
src/
  content/
    collection/<slug>.md     # one file per collection story (frontmatter)
    novella/taezhnyy-kapkan.md  # single file, chapters as ## headings
    config.ts                # Astro content collections schema
  layouts/
    BookPage.astro           # shared reading layout (typography, reading bar)
  components/
    Epigraph.astro, SceneBreak.astro, ChapterNav.astro, StoryNav.astro,
    SiteIndex.astro          # the home-page table of contents
  pages/
    index.astro              # home + full index
    zapiski-ohotoveda/index.astro          # collection contents
    zapiski-ohotoveda/[slug].astro         # per-story page
    taezhnyy-kapkan/index.astro            # novella (one long page)
  styles/
    book.css                 # classic-book typography & theme
.github/workflows/deploy.yml # build + deploy to GitHub Pages
astro.config.mjs             # site URL, sitemap + RSS integrations
```

## 4. Conversion pipeline (the careful part)

### 4.1 Structure manifest
A reviewed `structure.manifest.yaml` maps every detected heading candidate to a role and level, removing the title-vs-epigraph ambiguity. Sketch:

```yaml
works:
  - id: zapiski-ohotoveda
    title: "Записки охотоведа"
    source: source/КНИГА.docx.md
    entries:
      - { slug: detstvo, title: "Детство", kind: story, fromHeading: null }   # untitled opening; title TBD
      - { slug: znakomstvo-s-okhotugodyami, title: "Знакомство с охотугодьями", kind: story }
      - { slug: sobaki-v-moey-seme, title: "Собаки в моей семье", kind: story,
          subsections: ["Север","Буран и Пурга","Чок и Пуля", ...] }   # dog vignettes as ## within the page
      # ...
  - id: taezhnyy-kapkan
    title: "Таёжный капкан"
    source: source/ПОВЕСТЬ.docx.md
    single_page: true
    chapters: ["__opening__","Глава первая", ..., "Глава пятая","Капитанская дочка"]
```
Lines **not** listed as titles, but matching the ALL-CAPS pattern, are treated as **epigraphs**.

### 4.2 Cleaning rules (`convert.mjs`)
1. Un-escape pandoc punctuation (`\!`→`!`, `\-`→`-`, `\,`→`,`, `\*`→`*`, …).
2. Strip centering whitespace and docx first-line indents (CSS handles indentation).
3. `\*\*\*` / `***` lines → a `SceneBreak` marker.
4. Slice the source at manifest title lines into per-entry Markdown; titles become frontmatter, chapter/sub-vignette titles become `##` headings.
5. ALL-CAPS aphorism lines (not titles) → wrapped as `Epigraph` blocks.
6. Each clean file gets frontmatter: `title`, `slug`, `order`, `work`, optional `dedication`/`epigraph`/`date`.

### 4.3 Fidelity gate (`fidelity-check.mjs`)
After conversion, normalize both source and output to a bare token stream (strip punctuation, case, whitespace, markup) and assert the **converted text contains 100% of the source words in order**. Conversion fails loudly on any drift. This protects against silently dropping or scrambling the author's text.

## 5. Information architecture & URLs

- `/` — **Home / full index.** Site title «Записки охотоведа», a short about-the-author note, then a styled table of contents:
  - **Collection** — every story linked to its page (nested dog vignettes shown as sub-items).
  - **Novella** «Таёжный капкан» — every chapter linked to its anchor on the novella page.
- `/zapiski-ohotoveda/` — collection contents page (intro + story list).
- `/zapiski-ohotoveda/<slug>/` — one page per story; prev/next + “back to contents”. Dog-anthology stories keep their vignettes as `##` sections on one page.
- `/taezhnyy-kapkan/` — the novella, one continuous page; chapter `##` headings + a floating chapter list; closing epigraph.
- Latin transliterated slugs (`soboliny-kot`, `vrag-naroda`, …), curated in frontmatter for clean, stable URLs.
- Deferred (not built now): `/ob-avtore/` about-the-author page.

## 6. Reading design — classic book

- **PT Serif**, ~19–20px, line-height ~1.65, measure ~62ch, generous margins; cream/ivory “paper”, dark-ink text.
- **Indented paragraphs, no inter-paragraph gaps** — printed-book feel.
- **Epigraphs**: centered pull-quotes, letter-spacing, muted tone — clearly distinct from headings.
- Scene-break ornament for `***`; optional drop-cap on each story's first paragraph.
- Small unobtrusive reading bar: **light/dark toggle + font-size**. Fully responsive; comfortable on phones.

## 7. SEO & deploy

- `lang="ru"`; per-page `<title>` + meta description; OpenGraph/Twitter cards; **sitemap.xml**; **robots.txt**; **JSON-LD** (Book/Article); **RSS feed** for new pieces.
- GitHub Pages via GitHub Actions (build on push to `main`). Free `*.github.io` subdomain initially; custom domain = update `site` in `astro.config.mjs` + a `CNAME`.

## 8. Testing & verification

- Unit tests on conversion rules (un-escape, scene breaks, epigraph wrapping) with small fixtures.
- The §4.3 fidelity gate as a hard pass/fail.
- `astro build` succeeds; assert every expected page (home, collection index, each story, novella) is generated.

## 9. Open content decisions (resolved during build, not blocking)

- Title for the untitled autobiographical opening of the collection (e.g. «Детство» / «Родительский дом»), or present it as the contents-page intro.
- A one-paragraph about-the-author blurb for the home page; optional portrait photo.
- A joint pass over the title-vs-epigraph manifest before conversion.

## 10. Out of scope (YAGNI for v1)

Comments, search, audio narration, multi-author support, CMS, custom domain, analytics, about-the-author page. All remain easy to add later.
