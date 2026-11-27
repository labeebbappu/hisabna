import fc from 'fast-check';
import { maxMinor } from '@hisabna/money';
import type { CurrencyCode } from '@hisabna/money';
import {
  LedgerError,
  buildEntryShares,
  splitAdjustment,
  splitEqual,
  splitExact,
  splitPercent,
  splitShares,
} from '../src/index.js';
import type { Allocation, EntryShare, Payment, PersonId } from '../src/index.js';

export const CURRENCIES: CurrencyCode[] = ['QAR', 'KWD', 'BHD', 'OMR', 'JPY', 'SAR'];
export const OUTSIDER: PersonId = 'out';
export const JOIN_ORDER: PersonId[] = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', OUTSIDER];

export type Method = 'equal' | 'exact' | 'percent' | 'shares' | 'adjustment';

export type EntryCase = {
  currency: CurrencyCode;
  total: bigint;
  members: PersonId[];
  payments: Payment[];
  method: Method;
  /** Weights for percent (basis points, sum 10000) and shares; null otherwise. */
  weights: number[] | null;
  /** Re-runs the split with the same inputs (for determinism checks). */
  rerun: () => Allocation[];
  owed: Allocation[];
  shares: EntryShare[];
};

export type Base = {
  currency: CurrencyCode;
  total: bigint;
  members: PersonId[];
  payments: Payment[];
};

/** Splits `total` into `parts` non-negative bigints summing exactly to it, using random cut points. */
function cut(total: bigint, parts: number, cuts: bigint[]): bigint[] {
  const pts = cuts.map((c) => c % (total + 1n)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const out: bigint[] = [];
  let prev = 0n;
  for (let i = 0; i < parts - 1; i++) {
    out.push(pts[i]! - prev);
    prev = pts[i]!;
  }
  out.push(total - prev);
  return out;
}

const arbCuts = (n: number) => fc.array(fc.bigInt({ min: 0n, max: 2n ** 62n }), { minLength: n, maxLength: n });

function arbTotal(currency: CurrencyCode): fc.Arbitrary<bigint> {
  const max = maxMinor(currency);
  const small = fc.bigInt({ min: 1n, max: 10_000n < max ? 10_000n : max });
  const mid = fc.bigInt({ min: 1n, max: 10n ** 9n < max ? 10n ** 9n : max });
  const near = fc.bigInt({ min: 0n, max: 1000n }).map((d) => max - d);
  return fc.oneof(small, mid, near);
}

/** Currency, total, members p0..p(n-1) and 1-3 payers (maybe one outsider) paying exactly the total. */
export const makeArbBase = (maxMembers: number): fc.Arbitrary<Base> =>
  fc.constantFrom(...CURRENCIES).chain((currency) =>
  fc
    .record({
      total: arbTotal(currency),
      n: fc.integer({ min: 2, max: maxMembers }),
      withOutsider: fc.boolean(),
      cuts: arbCuts(2),
      order: fc.integer({ min: 1, max: 3 }),
    })
    .chain(({ total, n, withOutsider, cuts, order }) => {
      const members = Array.from({ length: n }, (_, i) => `p${i}`);
      const pool = withOutsider ? [...members, OUTSIDER] : members;
      return fc.shuffledSubarray(pool, { minLength: 1, maxLength: Math.min(order, pool.length) }).map((payers) => {
        const amounts = cut(total, payers.length, cuts);
        const payments = payers.map((personId, i) => ({ personId, paid: amounts[i]! }));
        return { currency, total, members, payments };
      });
    }),
);

export const arbBase: fc.Arbitrary<Base> = makeArbBase(8);

export const arbBps = (n: number): fc.Arbitrary<number[]> =>
  arbCuts(n - 1).map((c) => cut(10000n, n, c).map(Number));

export const arbWeights = (n: number): fc.Arbitrary<number[]> =>
  fc.array(fc.integer({ min: 1, max: 20 }), { minLength: n, maxLength: n });

/** Base plus valid weights for percent (`bps`) and shares (`weights`). */
export const arbWeighted = arbBase.chain((b) =>
  fc.record({ bps: arbBps(b.members.length), weights: arbWeights(b.members.length) }).map((w) => ({ ...b, ...w })),
);

type Raw = Base & {
  method: Method;
  bps: number[];
  weights: number[];
  exactCuts: bigint[];
  adjMask: boolean[];
  adjScale: bigint[];
};

function build(r: Raw): EntryCase | null {
  const { currency, total, members, payments, method } = r;
  const n = members.length;
  let weights: number[] | null = null;
  let run: () => Allocation[];
  switch (method) {
    case 'equal':
      run = () => splitEqual(total, members, payments);
      break;
    case 'exact': {
      const amounts = cut(total, n, r.exactCuts);
      run = () => splitExact(total, members.map((personId, i) => ({ personId, owed: amounts[i]! })));
      break;
    }
    case 'percent': {
      weights = r.bps;
      run = () => splitPercent(total, members.map((personId, i) => ({ personId, basisPoints: r.bps[i]! })), payments);
      break;
    }
    case 'shares': {
      weights = r.weights;
      run = () => splitShares(total, members.map((personId, i) => ({ personId, weight: r.weights[i]! })), payments);
      break;
    }
    case 'adjustment': {
      const bound = total / BigInt(4 * n);
      const adjustments = members
        .map((personId, i) => ({ personId, owed: (bound * r.adjScale[i]!) / 1000n, on: r.adjMask[i]! }))
        .filter((a) => a.on)
        .map(({ personId, owed }) => ({ personId, owed }));
      run = () => splitAdjustment(total, members, adjustments, payments);
      break;
    }
  }
  let owed: Allocation[];
  try {
    owed = run();
  } catch (e) {
    // Only an adjustment can legitimately be rejected for a negative share; anywhere else it is a bug.
    if (method === 'adjustment' && e instanceof LedgerError && e.code === 'NEGATIVE_SHARE') return null;
    throw e;
  }
  const shares = buildEntryShares(owed, payments);
  // One person paying and owing everything is rejected by design (SINGLE_PERSON, handbook T17).
  if (shares.length < 2) return null;
  return { currency, total, members, payments, method, weights, rerun: run, owed, shares };
}

const makeArbEntry = (base: fc.Arbitrary<Base>): fc.Arbitrary<EntryCase> =>
  base
    .chain((b) => {
      const n = b.members.length;
      return fc.record({
        method: fc.constantFrom<Method>('equal', 'exact', 'percent', 'shares', 'adjustment'),
        bps: arbBps(n),
        weights: arbWeights(n),
        exactCuts: arbCuts(n - 1),
        adjMask: fc.array(fc.boolean(), { minLength: n, maxLength: n }),
        adjScale: fc.array(fc.bigInt({ min: -1000n, max: 1000n }), { minLength: n, maxLength: n }),
      }).map((x) => ({ ...b, ...x }));
    })
    .map(build)
    .filter((e): e is EntryCase => e !== null);

/** 2-8 members: used by the 1000-run properties. */
export const arbEntry: fc.Arbitrary<EntryCase> = makeArbEntry(arbBase);

/** 2-100 members: exercises the group-size cap; use with a lower numRuns. */
export const arbEntryLarge: fc.Arbitrary<EntryCase> = makeArbEntry(makeArbBase(100));
