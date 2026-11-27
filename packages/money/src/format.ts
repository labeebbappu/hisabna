import { type CurrencyCode, decimalsOf } from './currency.js';

/** Format minor units as plain Latin digits with a fixed number of decimals. */
export function formatMinor(minor: bigint, code: CurrencyCode): string {
  const decimals = decimalsOf(code);
  const negative = minor < 0n;
  const digits = (negative ? -minor : minor).toString();
  const sign = negative ? '-' : '';
  if (decimals === 0) return sign + digits;
  const padded = digits.padStart(decimals + 1, '0');
  const cut = padded.length - decimals;
  return `${sign}${padded.slice(0, cut)}.${padded.slice(cut)}`;
}
