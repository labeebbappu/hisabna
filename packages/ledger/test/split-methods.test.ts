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
  it('T16: decimal weights as strings, 2.5 / 1 / 1 on 450.00 -> 250.00 / 100.00 / 100.00', () => {
    // W = 450 hundredths; 45000 * 250 / 450 = 25000, 45000 * 100 / 450 = 10000, twice.
    const out = splitShares(
      45000n,
      [
        { personId: 'A', weight: '2.5' },
        { personId: 'B', weight: '1' },
        { personId: 'C', weight: '1' },
      ],
      [p('A', 45000n)],
    );
    expect(owedOf(45000n, out)).toEqual([25000n, 10000n, 10000n]);
  });
  it('decimal weight 5.5', () => {
    const out = splitShares(10000n, [{ personId: 'A', weight: '5.5' }, { personId: 'B', weight: '4.5' }], []);
    expect(owedOf(10000n, out)).toEqual([5500n, 4500n]);
  });
  it('number weights must be integers: 2.5 is BAD_INPUT', () => {
    expect(code(() => splitShares(45000n, [{ personId: 'A', weight: 2.5 }, { personId: 'B', weight: 1 }], []))).toBe('BAD_INPUT');
    expect(code(() => splitShares(100n, [{ personId: 'A', weight: 1.5 }], []))).toBe('BAD_INPUT');
  });
  it('weight 0 gets 0n and is never charged the rounding difference', () => {
    // exact 50.5 each, half-up 51 + 51 = 102, diff -1; A (weight 0) is not eligible, so first weighted person B takes it.
    const out = splitShares(
      101n,
      [{ personId: 'A', weight: '0' }, { personId: 'B', weight: 1 }, { personId: 'C', weight: '1' }],
      [p('A', 101n)],
    );
    expect(owedOf(101n, out)).toEqual([0n, 50n, 51n]);
    expect(owedOf(100n, splitShares(100n, [{ personId: 'A', weight: 0 }, { personId: 'B', weight: 1 }], []))).toEqual([0n, 100n]);
  });
  it('all-zero weights are BAD_INPUT', () => {
    expect(code(() => splitShares(100n, [{ personId: 'A', weight: 0 }, { personId: 'B', weight: '0.00' }], []))).toBe('BAD_INPUT');
  });
  it('malformed, negative and non-finite weights are BAD_INPUT', () => {
    for (const w of ['1.234', '\u0661', '-1', '', '.5', '1.', '1e3', ' 1', '+1', -1, Number.NaN, Number.POSITIVE_INFINITY] as (string | number)[]) {
      expect(code(() => splitShares(100n, [{ personId: 'A', weight: w }, { personId: 'B', weight: 1 }], [])), String(w)).toBe('BAD_INPUT');
    }
  });
  it('duplicates and empty', () => {
    expect(code(() => splitShares(100n, [{ personId: 'A', weight: 1 }, { personId: 'A', weight: '2' }], []))).toBe('DUPLICATE_PERSON');
    expect(code(() => splitShares(100n, [], []))).toBe('BAD_INPUT');
  });
});

describe('splitAdjustment', () => {
  it('adds adjustment on top of equal remainder', () => {
    const out = splitAdjustment(10000n, ['A', 'B', 'C'], [a('A', 1000n)], [p('A', 10000n)]);
    expect(owedOf(10000n, out)).toEqual([4000n, 3000n, 3000n]);
  });
  it('adjustments above the total are fine when every result is >= 0', () => {
    // remainder -2000 -> equal share -1000 each -> 6000 - 1000 = 5000 each
    const out = splitAdjustment(10000n, ['A', 'B'], [a('A', 6000n), a('B', 6000n)], [p('A', 10000n)]);
    expect(owedOf(10000n, out)).toEqual([5000n, 5000n]);
  });
  it('remainder -1n: the largest payer takes the larger reduction', () => {
    // |remainder| 1 over 3 members: base 0, leftover 1 goes to payer B, so B owes 2500 - 1.
    const adj = [a('A', 5000n), a('B', 2500n), a('C', 2501n)];
    expect(owedOf(10000n, splitAdjustment(10000n, ['A', 'B', 'C'], adj, [p('B', 10000n)]))).toEqual([5000n, 2499n, 2501n]);
    // no payer among members: first member takes the unit
    expect(owedOf(10000n, splitAdjustment(10000n, ['A', 'B', 'C'], adj, []))).toEqual([4999n, 2500n, 2501n]);
  });
  it('a negative result after a negative remainder is NEGATIVE_SHARE', () => {
    expect(code(() => splitAdjustment(100n, ['A', 'B'], [a('A', 200n), a('B', 0n)], []))).toBe('NEGATIVE_SHARE');
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

describe('negative rounding diff the target cannot absorb is spread round-robin', () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);
  const sh = (w: number[]) => w.map((weight, i) => ({ personId: `p${i}`, weight }));
  const owedOf = (xs: Allocation[]) => xs.map((x) => x.owed);

  it('shares: tiny-weight payer skipped, largest gives up the unit', () => {
    const out = splitShares(7n, sh([12, 4, 1, 11, 16]), [p('p3', 1n), p('p2', 6n)]);
    expect(owedOf(out)).toEqual([2n, 1n, 0n, 2n, 2n]);
  });

  it('percent: zero-percent payer skipped', () => {
    const bps = [0, 12, 86, 4822, 5080];
    const out = splitPercent(
      9999135n,
      ids(5).map((personId, i) => ({ personId, basisPoints: bps[i]! })),
      [p('p0', 9999135n)],
    );
    expect(owedOf(out)).toEqual([0n, 11999n, 85993n, 4821583n, 5079560n]);
  });

  it('shares 6n [3,3,3,1,1,1] no payers does not throw', () => {
    expect(owedOf(splitShares(6n, sh([3, 3, 3, 1, 1, 1]), []))).toEqual(Array(6).fill(1n));
  });

  it('shares 8n [3,3,3,3,1,1,1,1] no payers does not throw', () => {
    expect(owedOf(splitShares(8n, sh([3, 3, 3, 3, 1, 1, 1, 1]), []))).toEqual(Array(8).fill(1n));
  });

  it('percent 8n no payers does not throw', () => {
    const bps = [1875, 1875, 1875, 1875, 625, 625, 625, 625];
    const out = splitPercent(8n, ids(8).map((personId, i) => ({ personId, basisPoints: bps[i]! })), []);
    expect(owedOf(out)).toEqual(Array(8).fill(1n));
  });

  it('shares 9n [1,1,1,1,1,1,9]: removal follows rounding excess, not rounded owed', () => {
    // exact 0.6 x6 (round up, excess +6), 5.4 (rounds to 5, excess -6); sum 11, diff -2;
    // payer p0 (owed 1) cannot absorb -2, so the two highest-excess people p0, p1 lose a unit.
    const out = splitShares(9n, sh([1, 1, 1, 1, 1, 1, 9]), [p('p0', 9n)]);
    expect(owedOf(out)).toEqual([0n, 0n, 1n, 1n, 1n, 1n, 5n]);
  });

  it('toWeight rejects unsafe integers', () => {
    const big = 2 ** 53;
    expect(code(() => splitShares(100n, [{ personId: 'A', weight: big }, { personId: 'B', weight: 1 }], []))).toBe('BAD_INPUT');
    expect(code(() => splitShares(100n, [{ personId: 'A', weight: big + 1 }, { personId: 'B', weight: 1 }], []))).toBe('BAD_INPUT');
    expect(
      code(() => splitPercent(100n, [{ personId: 'A', basisPoints: big }, { personId: 'B', basisPoints: 1 }], [])),
    ).toBe('BAD_INPUT');
    expect(code(() => splitShares(100n, [{ personId: 'A', weight: 2 ** 53 - 1 }, { personId: 'B', weight: 1 }], []))).toBeUndefined();
  });

  it('shares 2n [1,1,1,1] removes from the first two', () => {
    expect(owedOf(splitShares(2n, sh([1, 1, 1, 1]), []))).toEqual([0n, 0n, 1n, 1n]);
  });
});

describe('a 0% person is never the target of the rounding difference', () => {
  const pct = (bps: number[]) => bps.map((basisPoints, i) => ({ personId: 'ABCD'[i]!, basisPoints }));
  const owedOf = (xs: Allocation[]) => xs.map((x) => x.owed);

  it('0% payer is ineligible: largest owed (first on ties) takes the diff', () => {
    // exact B 33.33, C 33.33, D 33.34 -> 33,33,33; sum 99, diff +1; A (0%) excluded; first largest is B
    const out = splitPercent(100n, pct([0, 3333, 3333, 3334]), [p('A', 100n)]);
    expect(owedOf(out)).toEqual([0n, 34n, 33n, 33n]);
  });

  it('a positive-weight payer still takes the diff when a 0% person pays more', () => {
    const out = splitPercent(100n, pct([0, 3333, 3333, 3334]), [p('A', 60n), p('C', 40n)]);
    expect(owedOf(out)).toEqual([0n, 33n, 34n, 33n]);
  });
});
