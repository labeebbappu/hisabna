import { describe, expect, it } from 'vitest';
import { formatMinor } from '../src/index.js';

describe('formatMinor', () => {
  it('formats', () => {
    expect(formatMinor(10050n, 'QAR')).toBe('100.50');
    expect(formatMinor(1n, 'KWD')).toBe('0.001');
    expect(formatMinor(-3333n, 'QAR')).toBe('-33.33');
    expect(formatMinor(500n, 'JPY')).toBe('500');
    expect(formatMinor(0n, 'QAR')).toBe('0.00');
  });
});
