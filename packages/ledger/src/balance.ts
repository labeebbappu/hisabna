import type { CurrencyCode } from '@hisabna/money';
import { LedgerError } from './errors.js';
import type { LedgerEntry, PersonId } from './types.js';

export function computeNets(entries: LedgerEntry[]): Map<CurrencyCode, Map<PersonId, bigint>> {
  const result = new Map<CurrencyCode, Map<PersonId, bigint>>();
  for (const entry of entries) {
    if (entry.deleted) continue;
    let nets = result.get(entry.currency);
    if (!nets) {
      nets = new Map<PersonId, bigint>();
      result.set(entry.currency, nets);
    }
    for (const share of entry.shares) {
      nets.set(share.personId, (nets.get(share.personId) ?? 0n) + share.paid - share.owed);
    }
  }
  return result;
}

export function assertZeroSum(nets: Map<PersonId, bigint>): void {
  let sum = 0n;
  for (const v of nets.values()) sum += v;
  if (sum !== 0n) throw new LedgerError('NOT_BALANCED', `nets sum to ${sum}`);
}
