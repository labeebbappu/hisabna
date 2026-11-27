// Conformance tests against "Hisabna - Screen Workflows, Data Flow and Scenarios" v1.0.
// Test names carry the handbook scenario id (T09...) so the mapping stays visible.
import { describe, expect, it } from 'vitest';
import {
  LedgerError,
  assertZeroSum,
  buildEntryShares,
  computeNets,
  simplifyDebts,
  splitAdjustment,
  splitEqual,
  splitExact,
  splitPercent,
  splitShares,
  validateEntry,
} from '../src/index.js';
import type { Allocation, LedgerEntry, Payment } from '../src/index.js';

const p = (personId: string, paid: bigint): Payment => ({ personId, paid });
const a = (personId: string, owed: bigint): Allocation => ({ personId, owed });
const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof LedgerError ? e.code : 'OTHER';
  }
  return 'NONE';
};
const owedList = (xs: Allocation[]) => xs.map((x) => x.owed);

describe('T09-T11: equal splits with a remainder (handbook lines 5266-5272)', () => {
  it('T09 QAR 100.00 split equally by 3, payer included: 33.33 / 33.33 / 33.34, nets sum to 0.00', () => {
    const owed = splitEqual(10000n, ['A', 'B', 'C'], [p('C', 10000n)]);
    expect(owedList(owed)).toEqual([3333n, 3333n, 3334n]);
    const shares = buildEntryShares(owed, [p('C', 10000n)]);
    expect(() => validateEntry(10000n, shares, 'QAR')).not.toThrow();
    const nets = computeNets([{ id: 'e', currency: 'QAR', deleted: false, shares }]).get('QAR')!;
    expect(nets.get('C')).toBe(6666n);
    assertZeroSum(nets);
  });
  it('T10 KWD 1.000 split equally by 3: 0.333 / 0.333 / 0.334 (payer last); payer first gets the extra unit first', () => {
    expect(owedList(splitEqual(1000n, ['A', 'B', 'C'], [p('C', 1000n)]))).toEqual([333n, 333n, 334n]);
    expect(owedList(splitEqual(1000n, ['A', 'B', 'C'], [p('A', 1000n)]))).toEqual([334n, 333n, 333n]);
  });
  it('T11 JPY 1000 split by 3: 333 / 333 / 334 (payer last); payer first 334 / 333 / 333', () => {
    expect(owedList(splitEqual(1000n, ['A', 'B', 'C'], [p('C', 1000n)]))).toEqual([333n, 333n, 334n]);
    expect(owedList(splitEqual(1000n, ['A', 'B', 'C'], [p('A', 1000n)]))).toEqual([334n, 333n, 333n]);
  });
});

describe('T12-T17: rejected entries (handbook lines 2618-2620, 5273-5282)', () => {
  it("T12 multiple payers total QAR 250 for a QAR 300 expense: 'You are QAR 50.00 short.' -> NOT_BALANCED", () => {
    const owed = splitEqual(30000n, ['A', 'B', 'C'], [p('A', 15000n), p('B', 10000n)]);
    const shares = buildEntryShares(owed, [p('A', 15000n), p('B', 10000n)]);
    expect(code(() => validateEntry(30000n, shares, 'QAR'))).toBe('NOT_BALANCED');
  });
  it("T13 exact split sums to QAR 280 of 300: 'QAR 20.00 left to assign.' -> NOT_BALANCED", () => {
    expect(code(() => splitExact(30000n, [a('A', 14000n), a('B', 14000n)]))).toBe('NOT_BALANCED');
    const shares = buildEntryShares([a('A', 14000n), a('B', 14000n)], [p('A', 30000n)]);
    expect(code(() => validateEntry(30000n, shares, 'QAR'))).toBe('NOT_BALANCED');
  });
  it("T14 percentages sum to 90%: '10% left to assign.' -> BAD_INPUT", () => {
    expect(
      code(() =>
        splitPercent(30000n, [{ personId: 'A', basisPoints: 5000 }, { personId: 'B', basisPoints: 4000 }], []),
      ),
    ).toBe('BAD_INPUT');
  });
  it('T15 adjustment makes one share negative -> NEGATIVE_SHARE', () => {
    expect(code(() => splitAdjustment(10000n, ['A', 'B'], [a('A', -20000n)], []))).toBe('NEGATIVE_SHARE');
  });
  it("T16 shares 2.5 / 1 / 1 on QAR 450: 250.00 / 100.00 / 100.00", () => {
    const out = splitShares(
      45000n,
      [{ personId: 'A', weight: '2.5' }, { personId: 'B', weight: '1' }, { personId: 'C', weight: '1' }],
      [p('A', 45000n)],
    );
    expect(owedList(out)).toEqual([25000n, 10000n, 10000n]);
  });
  it("T17 expense paid by Ali only for Ali: 'This expense only involves Ali, so it doesn't change any balance.' -> SINGLE_PERSON", () => {
    const shares = buildEntryShares([a('Ali', 10000n)], [p('Ali', 10000n)]);
    expect(code(() => validateEntry(10000n, shares, 'QAR'))).toBe('SINGLE_PERSON');
  });
});

describe('Chapter 2 worked example: Ali, Sara and Omar (handbook lines 145-228)', () => {
  const members = ['Ali', 'Sara', 'Omar'];
  const mk = (id: string, owed: Allocation[], payments: Payment[], total: bigint): LedgerEntry => {
    const shares = buildEntryShares(owed, payments);
    validateEntry(total, shares, 'QAR');
    return { id, currency: 'QAR', deleted: false, shares };
  };
  const pay1 = [p('Ali', 15000n)];
  const pay2 = [p('Sara', 20000n)];
  const pay3 = [p('Omar', 30000n)];
  const pay4 = [p('Omar', 4000n)];
  const pay5 = [p('Sara', 1000n)];

  const owed1 = splitEqual(15000n, members, pay1);
  const owed2 = splitEqual(20000n, ['Sara', 'Omar'], pay2);
  const owed3 = splitPercent(
    30000n,
    [{ personId: 'Ali', basisPoints: 5000 }, { personId: 'Sara', basisPoints: 3000 }, { personId: 'Omar', basisPoints: 2000 }],
    pay3,
  );
  const owed4 = splitShares(4000n, [{ personId: 'Ali', weight: 2 }, { personId: 'Sara', weight: 1 }, { personId: 'Omar', weight: 1 }], pay4);
  const owed5 = splitEqual(1000n, members, pay5);
  const entries = [
    mk('1', owed1, pay1, 15000n),
    mk('2', owed2, pay2, 20000n),
    mk('3', owed3, pay3, 30000n),
    mk('4', owed4, pay4, 4000n),
    mk('5', owed5, pay5, 1000n),
  ];

  it('per-expense shares match the table in 2.1', () => {
    expect(owedList(owed1)).toEqual([5000n, 5000n, 5000n]);
    expect(owedList(owed2)).toEqual([10000n, 10000n]);
    expect(owedList(owed3)).toEqual([15000n, 9000n, 6000n]);
    expect(owedList(owed4)).toEqual([2000n, 1000n, 1000n]);
    expect(owedList(owed5)).toEqual([333n, 334n, 333n]);
  });

  it('Ali is not involved in the shopping: no row for him', () => {
    expect(entries[1]!.shares.map((s) => s.personId).sort()).toEqual(['Omar', 'Sara']);
  });

  it('totals match 2.2: Ali -73.33, Sara -43.34, Omar +116.67, sum 0', () => {
    const nets = computeNets(entries).get('QAR')!;
    expect(nets.get('Ali')).toBe(-7333n);
    expect(nets.get('Sara')).toBe(-4334n);
    expect(nets.get('Omar')).toBe(11667n);
    assertZeroSum(nets);
  });

  it('every expense nets to 0.00 on its own (2.2 rows)', () => {
    for (const e of entries) {
      let s = 0n;
      for (const sh of e.shares) s += sh.paid - sh.owed;
      expect(s).toBe(0n);
    }
  });

  it('T28 simplify on: 3 pairwise debts reducible to 2 -> exactly 2 payments, Ali->Omar 73.33 and Sara->Omar 43.34, every net cleared', () => {
    const nets = computeNets(entries).get('QAR')!;
    const out = simplifyDebts(nets, members);
    expect(out).toEqual([
      { from: 'Ali', to: 'Omar', amount: 7333n },
      { from: 'Sara', to: 'Omar', amount: 4334n },
    ]);
    const left = new Map(nets);
    for (const t of out) {
      left.set(t.from, left.get(t.from)! + t.amount);
      left.set(t.to, left.get(t.to)! - t.amount);
    }
    for (const v of left.values()) expect(v).toBe(0n);
  });
});
