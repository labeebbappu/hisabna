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
  it('accepts Extended Arabic-Indic (Persian) digits', () => {
    expect(parseAmount('\u06F1\u06F0\u06F0\u066B\u06F5\u06F0', 'QAR')).toBe(10050n);
    expect(parseAmount('\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u066B\u06F7\u06F8', 'QAR')).toBe(12345678n);
    expect(parseAmount('\u06F9\u06F0\u06F7\u06F6\u06F5\u06F4', 'JPY')).toBe(907654n);
  });
  it('strips invisible direction marks anywhere', () => {
    expect(parseAmount('\u200F100.50', 'QAR')).toBe(10050n);
    expect(parseAmount('\u200E100.50\u200E', 'QAR')).toBe(10050n);
    expect(parseAmount('\u0661\u0660\u0660\u061C\u066B\u0665\u0660', 'QAR')).toBe(10050n);
    expect(parseAmount('1\u200F0\u200E0.\u061C50', 'QAR')).toBe(10050n);
  });
  it('accepts mixed Latin, Arabic-Indic and Persian digits', () => {
    expect(parseAmount('1\u0660\u06F0.50', 'QAR')).toBe(10050n);
    expect(parseAmount('\u0661\u06F0\u0660.5', 'QAR')).toBe(10050n);
  });
  it('still rejects marks-only input', () => {
    expect(codeOf(() => parseAmount('\u200F\u200E', 'QAR'))).toBe('INVALID_AMOUNT');
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
  it('rejects too-large amounts', () => {
    expect(codeOf(() => parseAmount('9999999.001', 'KWD'))).toBe('AMOUNT_TOO_LARGE');
    expect(codeOf(() => parseAmount('10000000', 'QAR'))).toBe('AMOUNT_TOO_LARGE');
  });
  it('rejects zero amounts', () => {
    expect(codeOf(() => parseAmount('0', 'QAR'))).toBe('AMOUNT_NOT_POSITIVE');
    expect(codeOf(() => parseAmount('0.00', 'QAR'))).toBe('AMOUNT_NOT_POSITIVE');
    expect(codeOf(() => parseAmount('0.000', 'KWD'))).toBe('AMOUNT_NOT_POSITIVE');
  });
  it('keeps precedence: format, then decimals, then range', () => {
    expect(codeOf(() => parseAmount('abc', 'QAR'))).toBe('INVALID_AMOUNT');
    expect(codeOf(() => parseAmount('0.005', 'QAR'))).toBe('TOO_MANY_DECIMALS');
    expect(codeOf(() => parseAmount('99999999.005', 'QAR'))).toBe('TOO_MANY_DECIMALS');
  });
  it('accepts the maximum', () => {
    expect(parseAmount('9999999', 'QAR')).toBe(999999900n);
  });
});
