import { LedgerError } from '../errors.js';
import type { Allocation, Payment, PersonId } from '../types.js';
import { largestPayerIn } from './remainder.js';

export function splitEqual(total: bigint, members: PersonId[], payments: Payment[]): Allocation[] {
  if (members.length === 0 || total < 0n) throw new LedgerError('BAD_INPUT');
  if (new Set(members).size !== members.length) throw new LedgerError('DUPLICATE_PERSON');
  const n = BigInt(members.length);
  const base = total / n;
  const leftover = total % n;
  const payer = largestPayerIn(members, payments);
  return members.map((personId, i) => {
    let extra = 0n;
    if (payer !== null) extra = personId === payer ? leftover : 0n;
    else if (BigInt(i) < leftover) extra = 1n;
    return { personId, owed: base + extra };
  });
}
