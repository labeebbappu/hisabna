import { LedgerError } from '../errors.js';
import type { Allocation, Payment, PersonId } from '../types.js';
import { splitProportional, toWeight } from './proportional.js';

/** Pass `percents` in group join order (`Member.joined_at`): ties depend on it. */
export function splitPercent(
  total: bigint,
  percents: { personId: PersonId; basisPoints: number }[],
  payments: Payment[],
): Allocation[] {
  const entries = percents.map((x) => ({ personId: x.personId, weight: toWeight(x.basisPoints) }));
  if (entries.reduce((s, e) => s + e.weight, 0n) !== 10000n) throw new LedgerError('BAD_INPUT');
  return splitProportional(total, entries, payments);
}
