export type CurrencyCode = 'QAR' | 'SAR' | 'AED' | 'KWD' | 'BHD' | 'OMR' | 'JPY' | 'USD';

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

export function decimalsOf(code: CurrencyCode): 0 | 2 | 3 {
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
