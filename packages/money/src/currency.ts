import { MoneyError } from './errors.js';

export const CURRENCY_CODES = ['QAR', 'SAR', 'AED', 'KWD', 'BHD', 'OMR', 'JPY', 'USD'] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

const DECIMALS: Record<CurrencyCode, 0 | 2 | 3> = {
  QAR: 2,
  SAR: 2,
  AED: 2,
  KWD: 3,
  BHD: 3,
  OMR: 3,
  JPY: 0,
  USD: 2,
};

/** Runtime check: codes cross trust boundaries (API, storage), so types alone are not enough. */
export function isCurrencyCode(x: unknown): x is CurrencyCode {
  return typeof x === 'string' && Object.hasOwn(DECIMALS, x);
}

/** Throws MoneyError('UNKNOWN_CURRENCY') for anything that is not a supported code. */
export function decimalsOf(code: CurrencyCode): 0 | 2 | 3 {
  if (!isCurrencyCode(code)) throw new MoneyError('UNKNOWN_CURRENCY');
  return DECIMALS[code];
}

/** 9,999,999 major units expressed in minor units. */
export function maxMinor(code: CurrencyCode): bigint {
  return 9999999n * 10n ** BigInt(decimalsOf(code));
}

/** True when 0 < minor <= maxMinor(code). */
export function isAmountInRange(minor: bigint, code: CurrencyCode): boolean {
  return minor > 0n && minor <= maxMinor(code);
}
