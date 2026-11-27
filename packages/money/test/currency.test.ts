import { describe, expect, it } from 'vitest';
import {
  CURRENCY_CODES,
  MoneyError,
  decimalsOf,
  formatMinor,
  isAmountInRange,
  isCurrencyCode,
  maxMinor,
  parseAmount,
} from '../src/index.js';
import type { CurrencyCode } from '../src/index.js';

describe('currency', () => {
  it('decimalsOf', () => {
    expect(decimalsOf('QAR')).toBe(2);
    expect(decimalsOf('KWD')).toBe(3);
    expect(decimalsOf('BHD')).toBe(3);
    expect(decimalsOf('OMR')).toBe(3);
    expect(decimalsOf('JPY')).toBe(0);
  });
  it('maxMinor', () => {
    expect(maxMinor('QAR')).toBe(999999900n);
    expect(maxMinor('KWD')).toBe(9999999000n);
    expect(maxMinor('JPY')).toBe(9999999n);
  });
  it('isAmountInRange', () => {
    expect(isAmountInRange(0n, 'QAR')).toBe(false);
    expect(isAmountInRange(999999900n, 'QAR')).toBe(true);
    expect(isAmountInRange(999999901n, 'QAR')).toBe(false);
  });
});

describe('unknown currency codes', () => {
  const bad: unknown[] = ['XYZ', 'constructor', '__proto__', 'toString', 'hasOwnProperty', 'qar', 'Qar', '', ' QAR', undefined, null, 5, {}, ['QAR']];
  const codeOf = (fn: () => unknown) => {
    try {
      fn();
    } catch (e) {
      expect(e).toBeInstanceOf(MoneyError);
      return (e as MoneyError).code;
    }
    return undefined;
  };
  it('CURRENCY_CODES is the source of truth', () => {
    expect([...CURRENCY_CODES]).toEqual(['QAR', 'SAR', 'AED', 'KWD', 'BHD', 'OMR', 'JPY', 'USD']);
    for (const c of CURRENCY_CODES) expect(isCurrencyCode(c)).toBe(true);
  });
  it('isCurrencyCode rejects everything else', () => {
    for (const c of bad) expect(isCurrencyCode(c)).toBe(false);
  });
  it('every function throws UNKNOWN_CURRENCY', () => {
    for (const c of bad) {
      const code = c as CurrencyCode;
      expect(codeOf(() => decimalsOf(code))).toBe('UNKNOWN_CURRENCY');
      expect(codeOf(() => parseAmount('10.50', code))).toBe('UNKNOWN_CURRENCY');
      expect(codeOf(() => formatMinor(10050n, code))).toBe('UNKNOWN_CURRENCY');
      expect(codeOf(() => maxMinor(code))).toBe('UNKNOWN_CURRENCY');
      expect(codeOf(() => isAmountInRange(1n, code))).toBe('UNKNOWN_CURRENCY');
    }
  });
});
