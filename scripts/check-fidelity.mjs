import { readFileSync, readdirSync } from 'node:fs';
import { loadManifest } from './lib/manifest.mjs';
import { assertNoLoss } from './lib/fidelity.mjs';

const manifest = loadManifest('structure.manifest.yaml');
const DIRS = {
  'zapiski-ohotoveda': 'src/content/collection',
  'taezhnyy-kapkan': 'src/content/novella',
};

let failed = false;
for (const work of manifest.works) {
  // Remove the strip-list lines from the source: they are intentionally
  // discarded (book/file markers, editorial notes), so we do not require them.
  let source = readFileSync(work.source, 'utf8');
  for (const stripped of work.strip ?? []) source = source.split(stripped).join(' ');

  // Combine every generated file for this work, INCLUDING frontmatter, so the
  // display title (which carries the source heading's words) is counted.
  const dir = DIRS[work.id];
  const combined = readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => readFileSync(`${dir}/${f}`, 'utf8'))
    .join('\n');

  const { ok, missing } = assertNoLoss(source, combined);
  if (ok) {
    console.log(`✓ ${work.id}: no content loss`);
  } else {
    failed = true;
    console.error(`✗ ${work.id}: ${missing.length} source token(s) missing from output`);
    console.error(`  first 20: ${missing.slice(0, 20).join(', ')}`);
  }
}

process.exit(failed ? 1 : 0);
