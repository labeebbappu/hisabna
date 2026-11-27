import { type CurrencyCode, decimalsOf, maxMinor } from './currency.js';
import { MoneyError } from './errors.js';

/** Arabic-Indic (U+0660-0669), Extended Arabic-Indic (U+06F0-06F9) digits and the Arabic decimal separator (U+066B). */
const DIGIT_FORMS = /[\u0660-\u0669\u06F0-\u06F9\u066B]/g;
/** Invisible marks that RTL keyboards and pasted text insert: LRM, RLM, Arabic letter mark. */
const INVISIBLE_MARKS = /[\u200E\u200F\u061C]/g;

function toAscii(c: string): string {
  const cp = c.charCodeAt(0);
  if (cp === 0x066b) return '.';
  return String.fromCharCode(0x30 + (cp >= 0x06f0 ? cp - 0x06f0 : cp - 0x0660));
}

const FORMAT = /^[0-9]+(\.[0-9]+)?$/;

/** Parse a decimal string into minor units exactly, without any numeric parsing. */
export function parseAmount(input: string, code: CurrencyCode): bigint {
  const decimals = decimalsOf(code);
  const normalized = input.replace(INVISIBLE_MARKS, '').trim().replace(DIGIT_FORMS, toAscii);
  if (!FORMAT.test(normalized)) throw new MoneyError('INVALID_AMOUNT');
  const [intPart = '', fracPart = ''] = normalized.split('.');
  if (fracPart.length > decimals) throw new MoneyError('TOO_MANY_DECIMALS');
  const minor = BigInt(intPart + fracPart.padEnd(decimals, '0'));
  if (minor <= 0n) throw new MoneyError('AMOUNT_NOT_POSITIVE');
  if (minor > maxMinor(code)) throw new MoneyError('AMOUNT_TOO_LARGE');
  return minor;
}
