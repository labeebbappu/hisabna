import { describe, expect, it } from 'vitest';
import { MoneyError, maxMinor } from '@hisabna/money';
import type { CurrencyCode } from '@hisabna/money';
import { buildEntryShares, validateEntry, LedgerError } from '../src/index.js';
import type { EntryShare } from '../src/index.js';

const s = (personId: string, paid: bigint, owed: bigint): EntryShare => ({ personId, paid, owed });
const code = (fn: () => void) => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(LedgerError);
    return (e as LedgerError).code;
  }
  return undefined;
};

describe('validateEntry', () => {
  it('accepts a balanced entry', () => {
    expect(() =>
      validateEntry(10000n, [s('A', 10000n, 3334n), s('B', 0n, 3333n), s('C', 0n, 3333n)], 'QAR'),
    ).not.toThrow();
  });
  it('NOT_BALANCED when owed sum is short', () => {
    expect(code(() => validateEntry(10000n, [s('A', 10000n, 9999n)], 'QAR'))).toBe('NOT_BALANCED');
  });
  it('NOT_BALANCED when paid sum is short', () => {
    expect(code(() => validateEntry(10000n, [s('A', 9999n, 10000n)], 'QAR'))).toBe('NOT_BALANCED');
  });
  it('NOT_BALANCED when paid = owed but differ from total', () => {
    expect(code(() => validateEntry(10000n, [s('A', 10001n, 10001n)], 'QAR'))).toBe('NOT_BALANCED');
  });
  it('AMOUNT_NOT_POSITIVE for zero total', () => {
    expect(code(() => validateEntry(0n, [s('A', 0n, 0n)], 'QAR'))).toBe('AMOUNT_NOT_POSITIVE');
  });
  it('AMOUNT_OUT_OF_RANGE above max', () => {
    const t = maxMinor('QAR') + 1n;
    expect(code(() => validateEntry(t, [s('A', t, t)], 'QAR'))).toBe('AMOUNT_OUT_OF_RANGE');
  });
  it('NEGATIVE_SHARE', () => {
    expect(code(() => validateEntry(10000n, [s('A', 10001n, -1n), s('B', 0n, 10001n)], 'QAR'))).toBe('NEGATIVE_SHARE');
  });
  it('unknown currency throws a typed MoneyError UNKNOWN_CURRENCY', () => {
    for (const c of ['XYZ', 'constructor', 'qar', ''] as unknown as CurrencyCode[]) {
      try {
        validateEntry(10000n, [s('A', 10000n, 10000n)], c);
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(MoneyError);
        expect((e as MoneyError).code).toBe('UNKNOWN_CURRENCY');
      }
    }
  });
  it("SINGLE_PERSON: 'This expense only involves Ali, so it doesn't change any balance.' (T17)", () => {
    expect(code(() => validateEntry(10000n, [s('Ali', 10000n, 10000n)], 'QAR'))).toBe('SINGLE_PERSON');
  });
  it('two people are enough even when one pays and owes 0', () => {
    expect(() => validateEntry(10000n, [s('Ali', 10000n, 0n), s('Sara', 0n, 10000n)], 'QAR')).not.toThrow();
  });
  it('SINGLE_PERSON comes after NOT_BALANCED', () => {
    expect(code(() => validateEntry(10000n, [s('Ali', 10000n, 9999n)], 'QAR'))).toBe('NOT_BALANCED');
  });
  it('EMPTY_ENTRY', () => {
    expect(code(() => validateEntry(10000n, [], 'QAR'))).toBe('EMPTY_ENTRY');
  });
  it('DUPLICATE_PERSON', () => {
    expect(code(() => validateEntry(10000n, [s('A', 10000n, 5000n), s('A', 0n, 5000n)], 'QAR'))).toBe('DUPLICATE_PERSON');
  });
});

describe('buildEntryShares', () => {
  it('rejects duplicate owed', () => {
    expect(code(() => buildEntryShares([{ personId: 'A', owed: 5000n }, { personId: 'A', owed: 5000n }], []))).toBe('DUPLICATE_PERSON');
  });
  it('rejects duplicate payments', () => {
    expect(code(() => buildEntryShares([], [{ personId: 'A', paid: 1n }, { personId: 'A', paid: 1n }]))).toBe('DUPLICATE_PERSON');
  });
  it('drops rows where paid and owed are both 0n', () => {
    expect(
      buildEntryShares([{ personId: 'A', owed: 10000n }, { personId: 'B', owed: 0n }], [{ personId: 'A', paid: 10000n }, { personId: 'Z', paid: 0n }]),
    ).toEqual([s('A', 10000n, 10000n)]);
  });
  it('keeps a person who only paid or only owes', () => {
    expect(buildEntryShares([{ personId: 'B', owed: 5n }, { personId: 'C', owed: 0n }], [{ personId: 'A', paid: 5n }])).toEqual([
      s('B', 0n, 5n),
      s('A', 5n, 0n),
    ]);
  });
  it('unions people with missing side 0n', () => {
    expect(buildEntryShares([{ personId: 'A', owed: 10000n }], [{ personId: 'B', paid: 10000n }])).toEqual([
      s('A', 0n, 10000n),
      s('B', 10000n, 0n),
    ]);
  });
});
