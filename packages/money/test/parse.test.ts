import { describe, expect, it } from 'vitest';
import { MoneyError, parseAmount } from '../src/index.js';

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof MoneyError ? e.code : 'WRONG_ERROR';
  }
  return undefined;
}

describe('parseAmount', () => {
  it('parses valid amounts', () => {
    expect(parseAmount('100.50', 'QAR')).toBe(10050n);
    expect(parseAmount('100', 'QAR')).toBe(10000n);
    expect(parseAmount('1.000', 'KWD')).toBe(1000n);
    expect(parseAmount('500', 'JPY')).toBe(500n);
    expect(parseAmount(' 12.5 ', 'QAR')).toBe(1250n);
  });
  it('accepts Arabic-Indic digits and separator', () => {
    expect(parseAmount('١٠٠٫٥٠', 'QAR')).toBe(10050n);
  });
  it('rejects invalid formats', () => {
    for (const s of ['100,50', 'abc', '', '-5', '+5', '1e3', '.5', '100.']) {
      expect(codeOf(() => parseAmount(s, 'QAR')), s).toBe('INVALID_AMOUNT');
    }
  });
  it('rejects too many decimals', () => {
    expect(codeOf(() => parseAmount('10.005', 'QAR'))).toBe('TOO_MANY_DECIMALS');
    expect(codeOf(() => parseAmount('1.5', 'JPY'))).toBe('TOO_MANY_DECIMALS');
    expect(codeOf(() => parseAmount('500.0', 'JPY'))).toBe('TOO_MANY_DECIMALS');
  });
  it('rejects out of range', () => {
    expect(codeOf(() => parseAmount('9999999.001', 'KWD'))).toBe('OUT_OF_RANGE');
    expect(codeOf(() => parseAmount('10000000', 'QAR'))).toBe('OUT_OF_RANGE');
    expect(codeOf(() => parseAmount('0', 'QAR'))).toBe('OUT_OF_RANGE');
  });
  it('accepts the maximum', () => {
    expect(parseAmount('9999999', 'QAR')).toBe(999999900n);
  });
});
