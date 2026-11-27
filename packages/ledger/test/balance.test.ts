import { describe, expect, it } from 'vitest';
import { assertZeroSum, buildEntryShares, computeNets, LedgerError, splitEqual } from '../src/index.js';
import type { EntryShare, LedgerEntry } from '../src/index.js';

const s = (personId: string, paid: bigint, owed: bigint): EntryShare => ({ personId, paid, owed });
const entry = (id: string, currency: 'QAR' | 'KWD', shares: EntryShare[], deleted = false): LedgerEntry => ({
  id,
  currency,
  deleted,
  shares,
});
const dinner = (deleted = false) =>
  entry('e1', 'QAR', [s('A', 10000n, 3334n), s('B', 0n, 3333n), s('C', 0n, 3333n)], deleted);
const fourPerson = () =>
  entry('e2', 'QAR', [s('A', 7500n, 10000n), s('B', 3000n, 10000n), s('C', 29500n, 10000n), s('D', 0n, 10000n)]);

describe('computeNets', () => {
  it('QAR 100 dinner', () => {
    const nets = computeNets([dinner()]).get('QAR')!;
    expect(nets.get('A')).toBe(6666n);
    expect(nets.get('B')).toBe(-3333n);
    expect(nets.get('C')).toBe(-3333n);
    expect(() => assertZeroSum(nets)).not.toThrow();
  });
  it('four-person dinner', () => {
    const nets = computeNets([fourPerson()]).get('QAR')!;
    expect(nets.get('A')).toBe(-2500n);
    expect(nets.get('B')).toBe(-7000n);
    expect(nets.get('C')).toBe(19500n);
    expect(nets.get('D')).toBe(-10000n);
    expect(() => assertZeroSum(nets)).not.toThrow();
  });
  it('keeps currencies separate, each zero-sum', () => {
    const qar = entry('q', 'QAR', buildEntryShares(splitEqual(10000n, ['A', 'B', 'C'], [{ personId: 'A', paid: 10000n }]), [{ personId: 'A', paid: 10000n }]));
    const kwd = entry('k', 'KWD', buildEntryShares(splitEqual(3000n, ['B', 'C'], [{ personId: 'B', paid: 3000n }]), [{ personId: 'B', paid: 3000n }]));
    const nets = computeNets([qar, kwd]);
    expect([...nets.keys()]).toEqual(['QAR', 'KWD']);
    expect(nets.get('QAR')!.get('A')).toBe(6666n);
    expect(nets.get('KWD')!.get('B')).toBe(1500n);
    expect(nets.get('KWD')!.has('A')).toBe(false);
    for (const m of nets.values()) expect(() => assertZeroSum(m)).not.toThrow();
  });
  it('ignores deleted entries; restoring brings nets back', () => {
    const base = computeNets([fourPerson()]).get('QAR')!;
    const withDeleted = computeNets([fourPerson(), dinner(true)]);
    expect(withDeleted.get('QAR')).toEqual(base);
    const restored = computeNets([fourPerson(), dinner(false)]).get('QAR')!;
    expect(restored.get('A')).toBe(-2500n + 6666n);
    expect(restored.get('B')).toBe(-7000n - 3333n);
  });
  it('person only in deleted entries is absent; zero nets are kept', () => {
    const settled = entry('z', 'QAR', [s('A', 100n, 100n), s('B', 0n, 0n)]);
    const nets = computeNets([settled, dinner(true)]).get('QAR')!;
    expect(nets.get('A')).toBe(0n);
    expect(nets.has('B')).toBe(true);
    expect(nets.has('C')).toBe(false);
    expect(computeNets([dinner(true)]).size).toBe(0);
  });
  it('empty list gives empty map', () => {
    expect(computeNets([]).size).toBe(0);
  });
  it('does not mutate input', () => {
    const entries = [dinner(), fourPerson()];
    const copy = structuredClone(entries);
    computeNets(entries);
    expect(entries).toEqual(copy);
  });
});

describe('assertZeroSum', () => {
  it('throws NOT_BALANCED when sum is 1n', () => {
    try {
      assertZeroSum(new Map([['A', 2n], ['B', -1n]]));
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(LedgerError);
      expect((e as LedgerError).code).toBe('NOT_BALANCED');
    }
  });
  it('passes on empty map', () => {
    expect(() => assertZeroSum(new Map())).not.toThrow();
  });
});
