import { LedgerError } from '../errors.js';
import type { Allocation, Payment, PersonId } from '../types.js';
import { largestPayerIn } from './remainder.js';

/** Validates a JS number as a non-negative integer and converts it to bigint. */
export function toWeight(x: number): bigint {
  if (!Number.isInteger(x) || x < 0) throw new LedgerError('BAD_INPUT');
  return BigInt(x);
}

/**
 * Splits `total` in proportion to `weights` (all >= 0, sum > 0), rounding each
 * share half-up, then applies the whole rounding difference to the largest
 * payer among the people listed (else, or if that would make the payer's share
 * negative, the largest owed, first on ties).
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
  const payer = largestPayerIn(ids, payments);
  // Primary target: the largest payer in the split (only that person, never other
  // payers), else the largest owed (first index on ties).
  let target = out.findIndex((x) => x.personId === payer);
  if (target < 0) {
    target = 0;
    for (let i = 1; i < out.length; i++) if (out[i]!.owed > out[target]!.owed) target = i;
  }
  const t = out[target]!;
  if (t.owed + diff >= 0n) {
    t.owed += diff;
    return out;
  }
  // The target cannot absorb a negative diff: remove |diff| units one at a time,
  // round-robin over people ordered by rounded owed descending (ties: lower index),
  // skipping anyone at 0n. Always completes since rounded owed sum to total + |diff|.
  const order = out.map((_, i) => i).sort((a, b) => {
    const d = out[b]!.owed - out[a]!.owed;
    return d > 0n ? 1 : d < 0n ? -1 : a - b;
  });
  let remaining = -diff;
  while (remaining > 0n) {
    for (const i of order) {
      if (remaining === 0n) break;
      if (out[i]!.owed > 0n) {
        out[i]!.owed -= 1n;
        remaining -= 1n;
      }
    }
  }
  return out;
}
