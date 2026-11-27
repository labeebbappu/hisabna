import { LedgerError } from '../errors.js';
import type { Allocation } from '../types.js';

export function splitExact(total: bigint, amounts: Allocation[]): Allocation[] {
  if (amounts.length === 0) throw new LedgerError('BAD_INPUT');
  if (new Set(amounts.map((x) => x.personId)).size !== amounts.length) {
    throw new LedgerError('DUPLICATE_PERSON');
  }
  let sum = 0n;
  for (const x of amounts) {
    if (x.owed < 0n) throw new LedgerError('NEGATIVE_SHARE');
    sum += x.owed;
  }
  if (sum !== total) throw new LedgerError('NOT_BALANCED');
  return amounts.map((x) => ({ personId: x.personId, owed: x.owed }));
}
