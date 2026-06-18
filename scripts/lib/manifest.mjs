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
  // Sentence-case epigraphs the author wrote that the ALL-CAPS heuristic won't
  // catch; declared per story and matched by normalized text. Maps the
  // epigraph -> its owning story slug, so it is attached to that story even
  // when it appears in the source before the story's heading.
  const epigraphMap = new Map();

  for (const story of work.stories) {
    if (!story.untitled) {
      titleMap.set(normalizeTitle(story.title), story);
    }
    for (const sub of story.subsections ?? []) {
      subsectionMap.set(normalizeTitle(sub), { parent: story, title: sub });
    }
    if (story.epigraph) {
      epigraphMap.set(normalizeTitle(story.epigraph), story.slug);
    }
  }
  // Work-level epigraphs (e.g. a novella's dedication/verse before chapter one).
  for (const epi of work.epigraphs ?? []) {
    epigraphMap.set(normalizeTitle(epi), work.id);
  }
  return { titleMap, subsectionMap, stripSet, epigraphMap };
}
