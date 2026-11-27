import { describe, expect, it } from 'vitest';
import {
  splitExact,
  splitPercent,
  splitShares,
  splitAdjustment,
  LedgerError,
} from '../src/index.js';
import type { Allocation, Payment } from '../src/index.js';

const p = (personId: string, paid: bigint): Payment => ({ personId, paid });
const a = (personId: string, owed: bigint): Allocation => ({ personId, owed });
const code = (fn: () => void) => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(LedgerError);
    return (e as LedgerError).code;
  }
  return undefined;
};
const owedOf = (total: bigint, out: Allocation[]) => {
  expect(out.reduce((s, x) => s + x.owed, 0n)).toBe(total);
  return out.map((x) => x.owed);
};

describe('splitExact', () => {
  it('returns amounts unchanged', () => {
    const amounts = [a('A', 2500n), a('B', 7500n)];
    const out = splitExact(10000n, amounts);
    expect(out).toEqual(amounts);
    expect(owedOf(10000n, out)).toEqual([2500n, 7500n]);
  });
  it('NOT_BALANCED when sum differs', () => {
    expect(code(() => splitExact(10000n, [a('A', 2500n), a('B', 7000n)]))).toBe('NOT_BALANCED');
  });
  it('NEGATIVE_SHARE on negative amount', () => {
    expect(code(() => splitExact(100n, [a('A', -5n), a('B', 105n)]))).toBe('NEGATIVE_SHARE');
  });
  it('DUPLICATE_PERSON and empty', () => {
    expect(code(() => splitExact(100n, [a('A', 50n), a('A', 50n)]))).toBe('DUPLICATE_PERSON');
    expect(code(() => splitExact(0n, []))).toBe('BAD_INPUT');
  });
});

describe('splitPercent', () => {
  it('exact division', () => {
    const out = splitPercent(
      10000n,
      [
        { personId: 'A', basisPoints: 5000 },
        { personId: 'B', basisPoints: 2500 },
        { personId: 'C', basisPoints: 2500 },
      ],
      [],
    );
    expect(owedOf(10000n, out)).toEqual([5000n, 2500n, 2500n]);
  });
  const half = [
    { personId: 'A', basisPoints: 5000 },
    { personId: 'B', basisPoints: 5000 },
  ];
  it('rounding over comes off the payer', () => {
    expect(owedOf(1001n, splitPercent(1001n, half, [p('A', 1001n)]))).toEqual([500n, 501n]);
  });
  it('no payer in split: first largest absorbs', () => {
    expect(owedOf(1001n, splitPercent(1001n, half, [p('C', 1001n)]))).toEqual([500n, 501n]);
  });
  it('bad sum and non-integer bps are BAD_INPUT', () => {
    expect(
      code(() =>
        splitPercent(100n, [{ personId: 'A', basisPoints: 5000 }, { personId: 'B', basisPoints: 4999 }], []),
      ),
    ).toBe('BAD_INPUT');
    expect(
      code(() =>
        splitPercent(100n, [{ personId: 'A', basisPoints: 5000.5 }, { personId: 'B', basisPoints: 4999.5 }], []),
      ),
    ).toBe('BAD_INPUT');
    expect(code(() => splitPercent(100n, [], []))).toBe('BAD_INPUT');
  });
  it('duplicates', () => {
    expect(
      code(() =>
        splitPercent(100n, [{ personId: 'A', basisPoints: 5000 }, { personId: 'A', basisPoints: 5000 }], []),
      ),
    ).toBe('DUPLICATE_PERSON');
  });
});

describe('splitShares', () => {
  it('exact', () => {
    const out = splitShares(
      10000n,
      [
        { personId: 'A', weight: 2 },
        { personId: 'B', weight: 1 },
        { personId: 'C', weight: 1 },
      ],
      [],
    );
    expect(owedOf(10000n, out)).toEqual([5000n, 2500n, 2500n]);
  });
  it('rounding under goes to payer', () => {
    const out = splitShares(
      100n,
      [
        { personId: 'A', weight: 1 },
        { personId: 'B', weight: 1 },
        { personId: 'C', weight: 1 },
      ],
      [p('C', 100n)],
    );
    expect(owedOf(100n, out)).toEqual([33n, 33n, 34n]);
  });
  it('weight 0 or non-integer is BAD_INPUT', () => {
    expect(code(() => splitShares(100n, [{ personId: 'A', weight: 0 }, { personId: 'B', weight: 1 }], []))).toBe(
      'BAD_INPUT',
    );
    expect(code(() => splitShares(100n, [{ personId: 'A', weight: 1.5 }], []))).toBe('BAD_INPUT');
  });
});

describe('splitAdjustment', () => {
  it('adds adjustment on top of equal remainder', () => {
    const out = splitAdjustment(10000n, ['A', 'B', 'C'], [a('A', 1000n)], [p('A', 10000n)]);
    expect(owedOf(10000n, out)).toEqual([4000n, 3000n, 3000n]);
  });
  it('negative adjustment that stays valid', () => {
    const out = splitAdjustment(10000n, ['A', 'B'], [a('A', -9000n)], []);
    expect(owedOf(10000n, out)).toEqual([500n, 9500n]);
  });
  it('negative result throws NEGATIVE_SHARE', () => {
    expect(code(() => splitAdjustment(10000n, ['A', 'B'], [a('A', -20000n)], []))).toBe('NEGATIVE_SHARE');
  });
  it('adjustment for non-member is UNKNOWN_PERSON', () => {
    expect(code(() => splitAdjustment(100n, ['A', 'B'], [a('Z', 10n)], []))).toBe('UNKNOWN_PERSON');
  });
  it('duplicate adjustment persons', () => {
    expect(code(() => splitAdjustment(100n, ['A', 'B'], [a('A', 1n), a('A', 2n)], []))).toBe('DUPLICATE_PERSON');
  });
});

describe('rounding difference never makes the payer negative (property counterexamples)', () => {
  it('shares: tiny-weight payer is skipped when diff would go below zero', () => {
    const ids = ['p0', 'p1', 'p2', 'p3', 'p4'];
    const weights = [12, 4, 1, 11, 16];
    const out = splitShares(
      7n,
      ids.map((personId, i) => ({ personId, weight: weights[i]! })),
      [p('p3', 1n), p('p2', 6n)],
    );
    expect(out.reduce((s, x) => s + x.owed, 0n)).toBe(7n);
    expect(out.every((x) => x.owed >= 0n)).toBe(true);
  });

  it('percent: zero-percent payer is skipped when diff would go below zero', () => {
    const ids = ['p0', 'p1', 'p2', 'p3', 'p4'];
    const bps = [0, 12, 86, 4822, 5080];
    const out = splitPercent(
      9999135n,
      ids.map((personId, i) => ({ personId, basisPoints: bps[i]! })),
      [p('p0', 9999135n)],
    );
    expect(out.reduce((s, x) => s + x.owed, 0n)).toBe(9999135n);
    expect(out.every((x) => x.owed >= 0n)).toBe(true);
  });
});
