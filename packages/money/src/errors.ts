export type MoneyErrorCode = 'INVALID_AMOUNT' | 'TOO_MANY_DECIMALS' | 'OUT_OF_RANGE' | 'UNKNOWN_CURRENCY';

export class MoneyError extends Error {
  readonly code: MoneyErrorCode;
  constructor(code: MoneyErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'MoneyError';
    this.code = code;
  }
}
