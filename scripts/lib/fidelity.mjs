import { unescape } from './clean.mjs';

// Lowercased word tokens (Cyrillic/Latin/digits); punctuation and markup dropped.
export function tokenize(text) {
  const clean = unescape(text).toLowerCase();
  const matches = clean.match(/[\p{L}\p{N}]+/gu);
  return matches ?? [];
}

function countTokens(tokens) {
  const counts = new Map();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  return counts;
}

// Zero content loss = the source token multiset is contained in the output
// token multiset: every word appears in the output at least as many times as
// in the source. Order-independent (stories may be reordered, titles move to
// frontmatter) and duplication-tolerant (a title may repeat as a heading).
// Returns { ok, missing } where `missing` lists the distinct tokens whose
// output count falls short of the source.
export function assertNoLoss(sourceText, combinedOutput) {
  const srcCounts = countTokens(tokenize(sourceText));
  const outCounts = countTokens(tokenize(combinedOutput));
  const missing = [];
  for (const [tok, n] of srcCounts) {
    if ((outCounts.get(tok) ?? 0) < n) missing.push(tok);
  }
  return { ok: missing.length === 0, missing };
}
