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
