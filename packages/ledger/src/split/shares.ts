import { LedgerError } from '../errors.js';
import type { Allocation, Payment, PersonId } from '../types.js';
import { splitProportional, toWeight } from './proportional.js';

/** ASCII digits, optional fraction of 1-2 digits. Callers normalise Arabic digits first. */
const DECIMAL_WEIGHT = /^[0-9]+(\.[0-9]{1,2})?$/;

/** Exact weight in hundredths. Numbers are whole shares only; decimals must be strings. */
function toHundredths(w: number | string): bigint {
  if (typeof w === 'number') return toWeight(w) * 100n;
  if (!DECIMAL_WEIGHT.test(w)) throw new LedgerError('BAD_INPUT');
  const [intPart = '', fracPart = ''] = w.split('.');
  return BigInt(intPart) * 100n + BigInt(fracPart.padEnd(2, '0'));
}

/**
 * Split by share weights. A weight is a whole number, or a string with up to 2
 * decimals (e.g. '2.5' for a family; the handbook gives no cap on decimals, 2 is
 * provisional). Weight 0 is allowed (that person owes 0n) but the total must be > 0.
 * Pass `weights` in group join order (`Member.joined_at`): ties depend on it.
 */
export function splitShares(
  total: bigint,
  weights: { personId: PersonId; weight: number | string }[],
  payments: Payment[],
): Allocation[] {
  const entries = weights.map((x) => ({ personId: x.personId, weight: toHundredths(x.weight) }));
  return splitProportional(total, entries, payments);
}
