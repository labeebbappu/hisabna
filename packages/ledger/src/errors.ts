export type LedgerErrorCode =
  | 'NOT_BALANCED'
  | 'AMOUNT_NOT_POSITIVE'
  | 'AMOUNT_OUT_OF_RANGE'
  | 'DUPLICATE_PERSON'
  | 'NEGATIVE_SHARE'
  | 'EMPTY_ENTRY'
  | 'SINGLE_PERSON'
  | 'UNKNOWN_PERSON'
  | 'BAD_INPUT';

export class LedgerError extends Error {
  readonly code: LedgerErrorCode;
  constructor(code: LedgerErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'LedgerError';
    this.code = code;
  }
}
