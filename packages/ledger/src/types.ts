import type { CurrencyCode } from '@hisabna/money';

export type PersonId = string;
export type EntryShare = { personId: PersonId; paid: bigint; owed: bigint };
export type Payment = { personId: PersonId; paid: bigint };
export type Allocation = { personId: PersonId; owed: bigint };
export type LedgerEntry = {
  id: string;
  currency: CurrencyCode;
  deleted: boolean;
  shares: EntryShare[];
};
