import { describe, it, expect } from 'vitest';
import { unescape, isSceneBreak, uppercaseFraction, normalizeTitle, collapseWhitespace } from './clean.mjs';

describe('unescape', () => {
  it('removes pandoc escapes before punctuation', () => {
    expect(unescape('всегда с нами\\!')).toBe('всегда с нами!');
    expect(unescape('из\\-за угла')).toBe('из-за угла');
    expect(unescape('\\*\\*\\*')).toBe('***');
  });
  it('leaves ordinary backslashes-in-words alone-ish but strips before punctuation only', () => {
    expect(unescape('текст, \\(в скобках\\)')).toBe('текст, (в скобках)');
  });
});

describe('isSceneBreak', () => {
  it('detects asterisk dividers after unescape', () => {
    expect(isSceneBreak('   \\*\\*\\*   ')).toBe(true);
    expect(isSceneBreak('***')).toBe(true);
    expect(isSceneBreak('* * *')).toBe(true);
  });
  it('rejects normal text', () => {
    expect(isSceneBreak('обычный абзац')).toBe(false);
  });
  it('rejects a bare ** and accepts longer rows', () => {
    expect(isSceneBreak('**')).toBe(false);
    expect(isSceneBreak('****')).toBe(true);
  });
});

describe('uppercaseFraction', () => {
  it('is ~1 for all-caps cyrillic', () => {
    expect(uppercaseFraction('ВРАГ НАРОДА')).toBeGreaterThan(0.95);
  });
  it('is low for a normal sentence that merely starts with a caps word', () => {
    expect(uppercaseFraction('ЧЕМ ЯРЧЕ ЭЙФОРИЯ, тем тяжелее отходняк и долгий путь домой')).toBeLessThan(0.7);
  });
  it('is 0 with no letters', () => {
    expect(uppercaseFraction('123 — ***')).toBe(0);
  });
});

describe('normalizeTitle', () => {
  it('matches manifest titles regardless of trailing punctuation/escapes', () => {
    expect(normalizeTitle('  СОБОЛИНЫЙ КОТ.  ')).toBe('СОБОЛИНЫЙ КОТ');
    expect(normalizeTitle('ДОСАДНЫЙ СЛУЧАЙ\\!')).toBe('ДОСАДНЫЙ СЛУЧАЙ');
    expect(normalizeTitle('ГЛАВА   ПЕРВАЯ.')).toBe('ГЛАВА ПЕРВАЯ');
  });
  it('uppercases mixed-case Cyrillic input', () => {
    expect(normalizeTitle('Досадный случай\\!')).toBe('ДОСАДНЫЙ СЛУЧАЙ');
  });
});

describe('collapseWhitespace', () => {
  it('trims and collapses runs', () => {
    expect(collapseWhitespace('   а   б   ')).toBe('а б');
  });
});
