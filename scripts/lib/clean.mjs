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
  return /^\*( ?\*){2,}$/.test(s); // *** or * * * (3+ asterisks); rejects a bare **
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
  // Match key for pairing a manifest title with its source heading. Ignores
  // case, punctuation, dash variants (-, –, —) and spacing so a title matches
  // even when commas/dashes differ between the manifest and the source. Words
  // must still match. Used only for matching, never for display.
  return unescape(text)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toUpperCase();
}
