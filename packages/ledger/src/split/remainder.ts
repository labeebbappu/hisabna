import { LedgerError } from '../errors.js';
import type { Payment, PersonId } from '../types.js';

export function largestPayerIn(members: PersonId[], payments: Payment[]): PersonId | null {
  const seen = new Set<PersonId>();
  for (const pay of payments) {
    if (seen.has(pay.personId)) throw new LedgerError('DUPLICATE_PERSON');
    seen.add(pay.personId);
  }
  const paidBy = new Map<PersonId, bigint>();
  for (const pay of payments) if (pay.paid > 0n) paidBy.set(pay.personId, pay.paid);
  let best: PersonId | null = null;
  let bestPaid = 0n;
  for (const m of members) {
    const paid = paidBy.get(m);
    if (paid !== undefined && paid > bestPaid) {
      best = m;
      bestPaid = paid;
    }
  }
  return best;
}
