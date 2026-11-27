import { describe, expect, it } from 'vitest';
import { LedgerError, simplifyDebts } from '../src/index.js';
import type { Transfer } from '../src/index.js';

const t = (from: string, to: string, amount: bigint): Transfer => ({ from, to, amount });
const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof LedgerError ? e.code : 'OTHER';
  }
  return 'NONE';
};

describe('simplifyDebts', () => {
  it('T28 fixture', () => {
    const nets = new Map([['Ali', 40n], ['Omar', 10n], ['Sara', -30n], ['Noor', -20n]]);
    const out = simplifyDebts(nets, ['Ali', 'Sara', 'Omar', 'Noor']);
    expect(out).toEqual([t('Sara', 'Ali', 30n), t('Noor', 'Ali', 10n), t('Noor', 'Omar', 10n)]);
    const left = new Map(nets);
    for (const x of out) {
      left.set(x.from, left.get(x.from)! + x.amount);
      left.set(x.to, left.get(x.to)! - x.amount);
    }
    for (const v of left.values()) expect(v).toBe(0n);
    expect(out.length).toBeLessThanOrEqual(3);
  });
  it('four-person dinner', () => {
    const nets = new Map([['A', -2500n], ['B', -7000n], ['C', 19500n], ['D', -10000n]]);
    expect(simplifyDebts(nets, ['A', 'B', 'C', 'D'])).toEqual([t('D', 'C', 10000n), t('B', 'C', 7000n), t('A', 'C', 2500n)]);
  });
  it('all zero and single zero', () => {
    expect(simplifyDebts(new Map([['A', 0n], ['B', 0n]]), ['A', 'B'])).toEqual([]);
    expect(simplifyDebts(new Map([['A', 0n]]), ['A'])).toEqual([]);
  });
  it('debtor tie by join order', () => {
    const nets = new Map([['Z', 20n], ['Y', -10n], ['X', -10n]]);
    expect(simplifyDebts(nets, ['X', 'Y', 'Z'])).toEqual([t('X', 'Z', 10n), t('Y', 'Z', 10n)]);
  });
  it('creditor tie by join order', () => {
    const nets = new Map([['Q', 10n], ['P', 10n], ['D', -20n]]);
    expect(simplifyDebts(nets, ['P', 'Q', 'D'])).toEqual([t('D', 'P', 10n), t('D', 'Q', 10n)]);
  });
  it('NOT_BALANCED', () => {
    expect(code(() => simplifyDebts(new Map([['A', 5n], ['B', -3n]]), ['A', 'B']))).toBe('NOT_BALANCED');
  });
  it('UNKNOWN_PERSON, including zero-net person', () => {
    expect(code(() => simplifyDebts(new Map([['A', 5n], ['B', -5n]]), ['A']))).toBe('UNKNOWN_PERSON');
    expect(code(() => simplifyDebts(new Map([['A', 0n], ['G', 0n]]), ['A']))).toBe('UNKNOWN_PERSON');
  });
  it('does not mutate input', () => {
    const nets = new Map([['A', 5n], ['B', -5n]]);
    simplifyDebts(nets, ['A', 'B']);
    expect([...nets]).toEqual([['A', 5n], ['B', -5n]]);
  });
});
