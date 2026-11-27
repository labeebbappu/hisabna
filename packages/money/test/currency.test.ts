import { describe, expect, it } from 'vitest';
import { decimalsOf, isAmountInRange, maxMinor } from '../src/index.js';

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
