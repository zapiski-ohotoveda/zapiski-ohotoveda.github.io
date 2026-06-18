import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import GithubSlugger from 'github-slugger';
import { loadManifest } from './lib/manifest.mjs';
import { convertWork } from './lib/convert.mjs';

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
const empty = [];
for (const work of manifest.works) {
  const outDir = OUT[work.id];
  if (!outDir) throw new Error(`build-content: no output dir mapped for work "${work.id}" — add it to OUT`);
  const sourceText = readFileSync(work.source, 'utf8');
  const entries = convertWork(sourceText, work);
  for (const entry of entries) {
    const file = `${outDir}/${entry.slug}.md`;
    writeFileSync(file, frontmatter(entry, work) + entry.body);
    total += 1;
    if (entry.body.trim() === '') empty.push(file);
    console.log(`wrote ${file} (${entry.body.length} chars)`);
  }
}

// An empty body means a manifest title failed to match its source heading,
// so that story's text was misattributed to a neighbour. Fail loudly.
if (empty.length > 0) {
  console.error(`\nERROR: ${empty.length} file(s) have empty bodies — likely a title/heading`);
  console.error(`mismatch in structure.manifest.yaml. Check these slugs:\n  ${empty.join('\n  ')}`);
  process.exit(1);
}
console.log(`\nDone: ${total} files.`);
