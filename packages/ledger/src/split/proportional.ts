import { LedgerError } from '../errors.js';
import type { Allocation, Payment, PersonId } from '../types.js';
import { largestPayerIn } from './remainder.js';

/** Validates a JS number as a non-negative integer and converts it to bigint. */
export function toWeight(x: number): bigint {
  if (!Number.isSafeInteger(x) || x < 0) throw new LedgerError('BAD_INPUT');
  return BigInt(x);
}

/**
 * Splits `total` in proportion to `weights` (all >= 0, sum > 0), rounding each
 * share half-up, then applies the whole rounding difference (diff = total - sum)
 * to one target: the largest payer among the people with weight > 0 (ties: list
 * order), else the person with weight > 0 and the largest owed (first on ties).
 * People with weight 0n are never the target and never lose a unit.
 *
 * If the target cannot absorb a negative diff (its share would go below 0), the
 * whole diff is instead removed one unit at a time from people with weight > 0
 * and owed > 0, ordered by rounding excess (rounded * W - total * w) descending,
 * ties by lower list index, in a single pass.
 */
export function splitProportional(
  total: bigint,
  entries: { personId: PersonId; weight: bigint }[],
  payments: Payment[],
): Allocation[] {
  if (entries.length === 0 || total < 0n) throw new LedgerError('BAD_INPUT');
  const ids = entries.map((e) => e.personId);
  if (new Set(ids).size !== ids.length) throw new LedgerError('DUPLICATE_PERSON');
  const W = entries.reduce((s, e) => s + e.weight, 0n);
  if (W <= 0n) throw new LedgerError('BAD_INPUT');
  const out: Allocation[] = entries.map((e) => ({
    personId: e.personId,
    owed: (2n * total * e.weight + W) / (2n * W),
  }));
  const diff = total - out.reduce((s, x) => s + x.owed, 0n);
  if (diff === 0n) return out;
  // People with weight 0n are never the target. Primary target: the largest payer
  // among the weighted people (only that person, never other payers), else the
  // weighted person with the largest owed (first index on ties).
  const weighted = entries.filter((e) => e.weight > 0n).map((e) => e.personId);
  const payer = largestPayerIn(weighted, payments);
  let target = out.findIndex((x) => x.personId === payer);
  if (target < 0) {
    target = entries.findIndex((e) => e.weight > 0n);
    for (let i = target + 1; i < out.length; i++) {
      if (entries[i]!.weight > 0n && out[i]!.owed > out[target]!.owed) target = i;
    }
  }
  const t = out[target]!;
  if (t.owed + diff >= 0n) {
    t.owed += diff;
    return out;
  }
  // The target cannot absorb a negative diff: remove one unit each from the people
  // who were rounded up the most, ordered by rounding excess (rounded * W - total * w)
  // descending, ties by lower list index. Only people with weight > 0 and owed > 0 are
  // eligible. One pass is always enough: Σ(rounded - exact) = |diff| and each rounding
  // error is at most 1/2, so at least 2|diff| people have a positive excess.
  const excess = (i: number) => out[i]!.owed * W - total * entries[i]!.weight;
  const order = out
    .map((_, i) => i)
    .filter((i) => entries[i]!.weight > 0n && out[i]!.owed > 0n)
    .sort((a, b) => {
      const d = excess(b) - excess(a);
      return d > 0n ? 1 : d < 0n ? -1 : a - b;
    });
  let remaining = -diff;
  for (const i of order) {
    if (remaining === 0n) break;
    out[i]!.owed -= 1n;
    remaining -= 1n;
  }
  if (remaining !== 0n) throw new LedgerError('BAD_INPUT', 'rounding fallback could not place the difference');
  return out;
}
