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
  // catch; declared per story in the manifest and matched by normalized text.
  const epigraphSet = new Set();

  for (const story of work.stories) {
    if (!story.untitled) {
      titleMap.set(normalizeTitle(story.title), story);
    }
    for (const sub of story.subsections ?? []) {
      subsectionMap.set(normalizeTitle(sub), { parent: story, title: sub });
    }
    if (story.epigraph) {
      epigraphSet.add(normalizeTitle(story.epigraph));
    }
  }
  return { titleMap, subsectionMap, stripSet, epigraphSet };
}
