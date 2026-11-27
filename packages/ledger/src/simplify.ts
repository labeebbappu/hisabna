import { LedgerError } from './errors.js';
import { assertZeroSum } from './balance.js';
import type { PersonId } from './types.js';

export type Transfer = { from: PersonId; to: PersonId; amount: bigint };

export function simplifyDebts(nets: Map<PersonId, bigint>, joinOrder: PersonId[]): Transfer[] {
  const index = new Map<PersonId, number>();
  joinOrder.forEach((p, i) => {
    if (!index.has(p)) index.set(p, i);
  });
  for (const p of nets.keys()) {
    if (!index.has(p)) throw new LedgerError('UNKNOWN_PERSON', `person ${p} not in join order`);
  }
  assertZeroSum(nets);

  const work = new Map<PersonId, bigint>();
  for (const [p, v] of nets) if (v !== 0n) work.set(p, v);

  const transfers: Transfer[] = [];
  while (work.size > 0) {
    let debtor: PersonId | undefined;
    let creditor: PersonId | undefined;
    for (const [p, v] of work) {
      if (v < 0n) {
        if (debtor === undefined) debtor = p;
        else {
          const d = work.get(debtor)!;
          if (v < d || (v === d && index.get(p)! < index.get(debtor)!)) debtor = p;
        }
      } else {
        if (creditor === undefined) creditor = p;
        else {
          const c = work.get(creditor)!;
          if (v > c || (v === c && index.get(p)! < index.get(creditor)!)) creditor = p;
        }
      }
    }
    if (debtor === undefined || creditor === undefined) break;
    const dNet = work.get(debtor)!;
    const cNet = work.get(creditor)!;
    const owed = -dNet;
    const amount = owed < cNet ? owed : cNet;
    transfers.push({ from: debtor, to: creditor, amount });
    if (dNet + amount === 0n) work.delete(debtor);
    else work.set(debtor, dNet + amount);
    if (cNet - amount === 0n) work.delete(creditor);
    else work.set(creditor, cNet - amount);
  }
  return transfers;
}
