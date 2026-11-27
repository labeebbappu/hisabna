export type MoneyErrorCode = 'INVALID_AMOUNT' | 'TOO_MANY_DECIMALS' | 'AMOUNT_NOT_POSITIVE' | 'AMOUNT_TOO_LARGE' | 'UNKNOWN_CURRENCY';

export class MoneyError extends Error {
  readonly code: MoneyErrorCode;
  constructor(code: MoneyErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'MoneyError';
    this.code = code;
  }
}
