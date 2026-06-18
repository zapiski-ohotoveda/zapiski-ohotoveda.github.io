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
