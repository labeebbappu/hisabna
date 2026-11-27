import { isAmountInRange } from '@hisabna/money';
import type { CurrencyCode } from '@hisabna/money';
import { LedgerError } from './errors.js';
import type { Allocation, EntryShare, Payment, PersonId } from './types.js';

export function buildEntryShares(owed: Allocation[], payments: Payment[]): EntryShare[] {
  const byPerson = new Map<PersonId, EntryShare>();
  const seenOwed = new Set<PersonId>();
  for (const a of owed) {
    if (seenOwed.has(a.personId)) throw new LedgerError('DUPLICATE_PERSON', `duplicate owed: ${a.personId}`);
    seenOwed.add(a.personId);
    byPerson.set(a.personId, { personId: a.personId, paid: 0n, owed: a.owed });
  }
  const seenPaid = new Set<PersonId>();
  for (const p of payments) {
    if (seenPaid.has(p.personId)) throw new LedgerError('DUPLICATE_PERSON', `duplicate payment: ${p.personId}`);
    seenPaid.add(p.personId);
    const existing = byPerson.get(p.personId);
    if (existing) existing.paid = p.paid;
    else byPerson.set(p.personId, { personId: p.personId, paid: p.paid, owed: 0n });
  }
  return [...byPerson.values()];
}

export function validateEntry(total: bigint, shares: EntryShare[], currency: CurrencyCode): void {
  if (shares.length === 0) throw new LedgerError('EMPTY_ENTRY');
  const ids = new Set<PersonId>();
  for (const s of shares) {
    if (ids.has(s.personId)) throw new LedgerError('DUPLICATE_PERSON', `duplicate person: ${s.personId}`);
    ids.add(s.personId);
  }
  for (const s of shares) {
    if (s.paid < 0n || s.owed < 0n) throw new LedgerError('NEGATIVE_SHARE', `negative share: ${s.personId}`);
  }
  if (total <= 0n) throw new LedgerError('AMOUNT_NOT_POSITIVE');
  if (!isAmountInRange(total, currency)) throw new LedgerError('AMOUNT_OUT_OF_RANGE');
  let paid = 0n;
  let owed = 0n;
  for (const s of shares) {
    paid += s.paid;
    owed += s.owed;
  }
  if (paid !== total || owed !== total) throw new LedgerError('NOT_BALANCED');
}
