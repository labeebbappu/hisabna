import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { color, generateCss, themes, type ColorName } from '../src';

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const HEX = /^#[0-9a-f]{6}$/;

describe('tokens', () => {
  it('uses six-digit hex for every colour in every theme', () => {
    for (const pair of Object.values(color)) {
      for (const t of themes) expect(pair[t]).toMatch(HEX);
    }
  });

  const text: ColorName[] = ['text', 'text-muted', 'owed', 'owe'];
  const grounds: ColorName[] = ['bg', 'surface'];
  for (const theme of themes) {
    for (const fg of text) {
      for (const bg of grounds) {
        it(`${fg} on ${bg} is at least 4.5:1 (${theme})`, () => {
          expect(contrast(color[fg][theme], color[bg][theme])).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
    it(`on-accent on accent is at least 7:1 (${theme})`, () => {
      expect(contrast(color['on-accent'][theme], color.accent[theme])).toBeGreaterThanOrEqual(7);
    });
    for (const bg of grounds) {
      it(`line-strong and focus on ${bg} are at least 3:1 (${theme})`, () => {
        expect(contrast(color['line-strong'][theme], color[bg][theme])).toBeGreaterThanOrEqual(3);
        expect(contrast(color.focus[theme], color[bg][theme])).toBeGreaterThanOrEqual(3);
      });
    }
  }

  it('keeps tokens.css in sync with tokens.ts', () => {
    const file = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8');
    expect(file).toBe(generateCss());
  });
});
