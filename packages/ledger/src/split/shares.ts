import { LedgerError } from '../errors.js';
import type { Allocation, Payment, PersonId } from '../types.js';
import { splitProportional, toWeight } from './proportional.js';

export function splitShares(
  total: bigint,
  weights: { personId: PersonId; weight: number }[],
  payments: Payment[],
): Allocation[] {
  const entries = weights.map((x) => ({ personId: x.personId, weight: toWeight(x.weight) }));
  if (entries.some((e) => e.weight < 1n)) throw new LedgerError('BAD_INPUT');
  return splitProportional(total, entries, payments);
}
