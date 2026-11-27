import { type CurrencyCode, decimalsOf, maxMinor } from './currency.js';

export type MoneyErrorCode = 'INVALID_AMOUNT' | 'TOO_MANY_DECIMALS' | 'OUT_OF_RANGE';

export class MoneyError extends Error {
  readonly code: MoneyErrorCode;
  constructor(code: MoneyErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'MoneyError';
    this.code = code;
  }
}

const ARABIC_MAP: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
  '٫': '.',
};

const FORMAT = /^[0-9]+(\.[0-9]+)?$/;

/** Parse a decimal string into minor units exactly, without any numeric parsing. */
export function parseAmount(input: string, code: CurrencyCode): bigint {
  const normalized = input.trim().replace(/[٠-٩٫]/g, (c) => ARABIC_MAP[c] ?? c);
  if (!FORMAT.test(normalized)) throw new MoneyError('INVALID_AMOUNT');
  const decimals = decimalsOf(code);
  const [intPart = '', fracPart = ''] = normalized.split('.');
  if (fracPart.length > decimals) throw new MoneyError('TOO_MANY_DECIMALS');
  const minor = BigInt(intPart + fracPart.padEnd(decimals, '0'));
  if (minor <= 0n || minor > maxMinor(code)) throw new MoneyError('OUT_OF_RANGE');
  return minor;
}
