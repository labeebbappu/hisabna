import { LedgerError } from '../errors.js';
import type { Allocation, Payment, PersonId } from '../types.js';
import { splitEqual } from './equal.js';

/**
 * provisional: handbook gives no worked example. Each adjustment is a signed
 * extra amount that person owes; the signed remainder (total - sum of
 * adjustments) is split equally among members, then adjustments are added.
 * A negative remainder is split on its absolute value with the same equal-split
 * rules and subtracted (so the payer, who gets the leftover, is reduced the most),
 * unless that would push a result below 0: then the no-payer rule is used.
 * The only requirement is that every final amount is >= 0 (handbook line 5179).
 * Pass `members` in group join order (`Member.joined_at`): ties depend on it.
 */
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
  const negative = remainder < 0n;
  const adjBy = new Map(adjustments.map((x) => [x.personId, x.owed] as const));
  const build = (pay: Payment[]) =>
    splitEqual(negative ? -remainder : remainder, members, pay).map((x) => ({
      personId: x.personId,
      owed: (negative ? -x.owed : x.owed) + (adjBy.get(x.personId) ?? 0n),
    }));
  let out = build(payments);
  // provisional: if giving the payer the leftover makes someone's result go below 0 (a payer
  // absorbing a negative remainder, or a negative adjustment next to an odd unit), use the
  // no-payer rule instead: one unit each to the first members in member order.
  if (out.some((x) => x.owed < 0n)) out = build([]);
  for (const x of out) if (x.owed < 0n) throw new LedgerError('NEGATIVE_SHARE');
  return out;
}
