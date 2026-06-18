import { describe, it, expect } from 'vitest';
import { tokenize, assertNoLoss } from './fidelity.mjs';

describe('tokenize', () => {
  it('splits into lowercased word tokens, dropping punctuation/markup', () => {
    expect(tokenize('Я родился\\! «В» Павлодаре — ***')).toEqual(['я', 'родился', 'в', 'павлодаре']);
  });
});

describe('assertNoLoss (multiset containment: source ⊆ output)', () => {
  it('passes when every source word survives (titles may move to ## headings)', () => {
    const src = 'Я родился в Павлодаре. СОБОЛИНЫЙ КОТ. История про кота.';
    const out = '## Соболиный кот\n\nЯ родился в Павлодаре. История про кота.';
    expect(assertNoLoss(src, out).ok).toBe(true);
  });
  it('fails and reports a missing word', () => {
    const src = 'охотник нашёл редкого соболя в тайге';
    const out = 'охотник нашёл в тайге';
    const r = assertNoLoss(src, out);
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('редкого');
  });
  it('ignores word order and allows duplication in the output', () => {
    const src = 'волк и заяц';
    const out = 'заяц волк волк и'; // reordered + duplicated — still no loss
    expect(assertNoLoss(src, out).ok).toBe(true);
  });
  it('counts multiplicity (a repeated source word dropped once is caught)', () => {
    const src = 'эхо эхо в горах';
    const out = 'эхо в горах';
    const r = assertNoLoss(src, out);
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('эхо');
  });
});
