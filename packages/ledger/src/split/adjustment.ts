import { LedgerError } from '../errors.js';
import type { Allocation, Payment, PersonId } from '../types.js';
import { splitEqual } from './equal.js';

// Definition of Adjustment is unconfirmed against product spec: each adjustment
// is a signed extra amount that person owes; the rest (total - sum of
// adjustments) is split equally among members, then adjustments are added.
export function splitAdjustment(
  total: bigint,
  members: PersonId[],
  adjustments: Allocation[],
  payments: Payment[],
): Allocation[] {
  const memberSet = new Set(members);
  const seen = new Set<PersonId>();
  let adjSum = 0n;
  for (const adj of adjustments) {
    if (!memberSet.has(adj.personId)) throw new LedgerError('UNKNOWN_PERSON');
    if (seen.has(adj.personId)) throw new LedgerError('DUPLICATE_PERSON');
    seen.add(adj.personId);
    adjSum += adj.owed;
  }
  const remainder = total - adjSum;
  if (remainder < 0n) throw new LedgerError('NEGATIVE_SHARE');
  const adjBy = new Map(adjustments.map((x) => [x.personId, x.owed] as const));
  return splitEqual(remainder, members, payments).map((x) => {
    const owed = x.owed + (adjBy.get(x.personId) ?? 0n);
    if (owed < 0n) throw new LedgerError('NEGATIVE_SHARE');
    return { personId: x.personId, owed };
  });
}
