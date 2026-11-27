import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { formatMinor, isAmountInRange, maxMinor, parseAmount } from '@hisabna/money';
import {
  assertZeroSum,
  computeNets,
  simplifyDebts,
  splitPercent,
  splitShares,
  validateEntry,
} from '../src/index.js';
import type { LedgerEntry, PersonId } from '../src/index.js';
import { CURRENCIES, JOIN_ORDER, arbEntry, arbWeighted } from './arbitraries.js';
import type { EntryCase } from './arbitraries.js';

const cfg = { numRuns: 1000 };
const sum = (xs: bigint[]) => xs.reduce((a, b) => a + b, 0n);

const toLedger = (cases: EntryCase[], deleted: boolean[] = []): LedgerEntry[] =>
  cases.map((c, i) => ({ id: `e${i}`, currency: c.currency, deleted: deleted[i] ?? false, shares: c.shares }));

const arbEntries = fc.array(arbEntry, { minLength: 1, maxLength: 8 });

describe('Invariant 1: every built entry validates', () => {
  it('validateEntry passes and sums balance', () => {
    fc.assert(
      fc.property(arbEntry, (e) => {
        expect(() => validateEntry(e.total, e.shares, e.currency)).not.toThrow();
        expect(sum(e.shares.map((s) => s.owed))).toBe(e.total);
        expect(sum(e.shares.map((s) => s.paid))).toBe(e.total);
      }),
      cfg,
    );
  });
});

describe('Invariant 2: nets are zero-sum per currency', () => {
  it('zero-sum, stays zero-sum with deletions, restores on undelete', () => {
    fc.assert(
      fc.property(arbEntries, fc.array(fc.boolean(), { minLength: 8, maxLength: 8 }), (cases, mask) => {
        const original = computeNets(toLedger(cases));
        for (const nets of original.values()) assertZeroSum(nets);
        const withDeleted = computeNets(toLedger(cases, mask));
        for (const nets of withDeleted.values()) assertZeroSum(nets);
        // deleted entries are left out: same as building from only the live ones
        const live = cases.filter((_, i) => !mask[i]);
        expect(withDeleted).toEqual(computeNets(toLedger(live)));
        // undelete: flip the flags back on the same entry objects
        const entries = toLedger(cases, mask);
        for (const en of entries) en.deleted = false;
        expect(computeNets(entries)).toEqual(original);
      }),
      cfg,
    );
  });
});

describe('Invariant 3: amounts in range and format/parse round trip', () => {
  it('generated amounts are in range', () => {
    fc.assert(
      fc.property(arbEntry, (e) => {
        expect(isAmountInRange(e.total, e.currency)).toBe(true);
        for (const s of e.shares) {
          expect(s.owed >= 0n && s.owed <= e.total).toBe(true);
          expect(s.paid >= 0n && s.paid <= e.total).toBe(true);
        }
      }),
      cfg,
    );
  });
  for (const c of CURRENCIES) {
    it(`parseAmount(formatMinor(x)) === x for ${c}`, () => {
      fc.assert(
        fc.property(fc.bigInt({ min: 1n, max: maxMinor(c) }), (x) => {
          expect(parseAmount(formatMinor(x, c), c)).toBe(x);
        }),
        cfg,
      );
    });
  }
});

describe('Invariant 6: simplifyDebts', () => {
  it('at most n-1 positive transfers that zero every net', () => {
    fc.assert(
      fc.property(arbEntries, (cases) => {
        for (const nets of computeNets(toLedger(cases)).values()) {
          const transfers = simplifyDebts(nets, JOIN_ORDER);
          const nonZero = [...nets.values()].filter((v) => v !== 0n).length;
          expect(transfers.length).toBeLessThanOrEqual(Math.max(nonZero - 1, 0));
          const left = new Map(nets);
          for (const t of transfers) {
            expect(t.amount > 0n).toBe(true);
            expect(nets.get(t.from) ?? 0n).not.toBe(0n);
            expect(nets.get(t.to) ?? 0n).not.toBe(0n);
            left.set(t.from, (left.get(t.from) ?? 0n) + t.amount);
            left.set(t.to, (left.get(t.to) ?? 0n) - t.amount);
          }
          for (const v of left.values()) expect(v).toBe(0n);
        }
      }),
      cfg,
    );
  });
});

describe('Equal split', () => {
  it('sums to total, non-negative, spread bounded by leftover', () => {
    fc.assert(
      fc.property(
        arbEntry.filter((e) => e.method === 'equal'),
        (e) => {
          const owed = e.owed.map((a) => a.owed);
          expect(sum(owed)).toBe(e.total);
          expect(owed.every((v) => v >= 0n)).toBe(true);
          const spread = owed.reduce((a, b) => (a > b ? a : b)) - owed.reduce((a, b) => (a < b ? a : b));
          const leftover = e.total % BigInt(e.members.length);
          // independent oracle: largest paid (> 0n) among members, ties earliest in members
          let recipient: string | null = null;
          let best = 0n;
          for (const m of e.members) {
            const paid = e.payments.find((x) => x.personId === m)?.paid ?? 0n;
            if (paid > best) {
              best = paid;
              recipient = m;
            }
          }
          expect(spread <= (recipient !== null ? leftover : 1n)).toBe(true);
          if (recipient !== null) {
            const base = e.total / BigInt(e.members.length);
            for (const a of e.owed) expect(a.owed).toBe(a.personId === recipient ? base + leftover : base);
          }
        },
      ),
      cfg,
    );
  });
});

describe('Percent and Shares', () => {
  const check = (
    kind: 'percent' | 'shares',
    run: () => { personId: PersonId; owed: bigint }[],
    total: bigint,
    weights: number[],
  ) => {
    const n = BigInt(weights.length);
    const owed = run(); // must never throw for valid input
    const W = kind === 'percent' ? 10000n : weights.reduce((a, b) => a + BigInt(b), 0n);
    expect(sum(owed.map((a) => a.owed))).toBe(total);
    owed.forEach((a, i) => {
      expect(a.owed >= 0n).toBe(true);
      const d = a.owed * W - total * BigInt(weights[i]!);
      expect((d < 0n ? -d : d) <= n * W).toBe(true);
    });
  };

  it('percent is within n*W of exact proportion', () => {
    fc.assert(
      fc.property(arbWeighted, (b) => {
        check(
          'percent',
          () => splitPercent(b.total, b.members.map((personId, i) => ({ personId, basisPoints: b.bps[i]! })), b.payments),
          b.total,
          b.bps,
        );
      }),
      cfg,
    );
  });

  it('shares is within n*W of exact proportion', () => {
    fc.assert(
      fc.property(arbWeighted, (b) => {
        check(
          'shares',
          () => splitShares(b.total, b.members.map((personId, i) => ({ personId, weight: b.weights[i]! })), b.payments),
          b.total,
          b.weights,
        );
      }),
      cfg,
    );
  });
});

describe('Percent: zero-weight people', () => {
  it('a person at 0 basis points always owes 0n', () => {
    const arb = arbWeighted.chain((b) =>
      fc.array(fc.boolean(), { minLength: b.members.length, maxLength: b.members.length }).map((zero) => {
        const bps = [...b.bps];
        const keep = bps.findIndex((_, i) => !zero[i]);
        const k = keep < 0 ? 0 : keep;
        let moved = 0;
        bps.forEach((v, i) => {
          if (i !== k && (zero[i] ?? false)) {
            moved += v;
            bps[i] = 0;
          }
        });
        bps[k] = bps[k]! + moved;
        return { ...b, bps };
      }),
    );
    fc.assert(
      fc.property(arb, (b) => {
        const out = splitPercent(b.total, b.members.map((personId, i) => ({ personId, basisPoints: b.bps[i]! })), b.payments);
        expect(sum(out.map((a) => a.owed))).toBe(b.total);
        out.forEach((a, i) => {
          if (b.bps[i] === 0) expect(a.owed).toBe(0n);
        });
      }),
      cfg,
    );
  });
});

describe('Determinism', () => {
  it('same input gives equal output for every method', () => {
    fc.assert(
      fc.property(arbEntry, (e) => {
        expect(e.rerun()).toEqual(e.owed);
        expect(e.rerun()).toEqual(e.rerun());
      }),
      cfg,
    );
  });
});

