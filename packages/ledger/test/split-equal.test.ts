import { describe, expect, it } from 'vitest';
import { splitEqual, largestPayerIn, LedgerError } from '../src/index.js';
import type { Payment } from '../src/index.js';

const p = (personId: string, paid: bigint): Payment => ({ personId, paid });
const code = (fn: () => void) => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(LedgerError);
    return (e as LedgerError).code;
  }
  return undefined;
};
const run = (total: bigint, members: string[], payments: Payment[]) => {
  const out = splitEqual(total, members, payments);
  expect(out.map((a) => a.personId)).toEqual(members);
  expect(out.reduce((s, a) => s + a.owed, 0n)).toBe(total);
  return out.map((a) => a.owed);
};

describe('splitEqual', () => {
  it('T09', () => {
    expect(run(10000n, ['A', 'B', 'C'], [p('C', 10000n)])).toEqual([3333n, 3333n, 3334n]);
  });
  it('T10 (KWD)', () => {
    expect(run(1000n, ['A', 'B', 'C'], [p('C', 1000n)])).toEqual([333n, 333n, 334n]);
  });
  it('four-person dinner', () => {
    expect(
      run(40000n, ['A', 'B', 'C', 'D'], [p('A', 7500n), p('B', 3000n), p('C', 29500n), p('D', 0n)]),
    ).toEqual([10000n, 10000n, 10000n, 10000n]);
  });
  it('multiple payers, leftover to the largest', () => {
    expect(run(10000n, ['A', 'B', 'C'], [p('A', 6000n), p('B', 4000n)])).toEqual([3334n, 3333n, 3333n]);
  });
  it('payer not in the split', () => {
    expect(run(10000n, ['B', 'C', 'D'], [p('A', 10000n)])).toEqual([3334n, 3333n, 3333n]);
  });
  it('tiny total', () => {
    expect(run(1n, ['A', 'B', 'C'], [p('B', 1n)])).toEqual([0n, 1n, 0n]);
  });
  it('tiny total, payer not in split', () => {
    expect(run(2n, ['B', 'C', 'D'], [p('A', 2n)])).toEqual([1n, 1n, 0n]);
  });
  it('DUPLICATE_PERSON for repeated members', () => {
    expect(code(() => splitEqual(100n, ['A', 'A'], []))).toBe('DUPLICATE_PERSON');
  });
  it('BAD_INPUT for empty members', () => {
    expect(code(() => splitEqual(100n, [], []))).toBe('BAD_INPUT');
  });
  it('BAD_INPUT for negative total', () => {
    expect(code(() => splitEqual(-1n, ['A'], []))).toBe('BAD_INPUT');
  });
});

describe('largestPayerIn', () => {
  it('ignores a zero payer', () => {
    expect(largestPayerIn(['A', 'B'], [p('A', 0n), p('B', 5n)])).toBe('B');
    expect(largestPayerIn(['A', 'B'], [p('A', 0n)])).toBeNull();
  });
  it('ties go to the earlier member', () => {
    expect(largestPayerIn(['A', 'B'], [p('B', 5n), p('A', 5n)])).toBe('A');
  });
  it('throws DUPLICATE_PERSON for repeated payers', () => {
    expect(code(() => largestPayerIn(['A'], [p('A', 1n), p('A', 2n)]))).toBe('DUPLICATE_PERSON');
  });
});
