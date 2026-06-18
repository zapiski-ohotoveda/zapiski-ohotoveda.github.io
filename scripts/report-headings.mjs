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
