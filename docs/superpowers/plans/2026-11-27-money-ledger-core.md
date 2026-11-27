# Money and Ledger Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the Hisabna monorepo and build the `@hisabna/money` and `@hisabna/ledger` packages: exact integer money, five split methods with multiple payers, balances, and Simplify debts, proven by example and property-based tests.

**Architecture:** A pnpm + Turborepo monorepo (flat `apps/*`, `packages/*`). `money` and `ledger` are pure TypeScript with no framework or Node-only imports, so the same code runs on phone, web and server. Money is `bigint` minor units everywhere. Internal packages export TypeScript source directly.

**Tech Stack:** Node 22, pnpm, Turborepo, TypeScript (strict), Vitest, fast-check, ESLint.

**Spec:** `docs/superpowers/specs/2026-11-27-hisabna-mvp-design.md` (rules in §3, §7; invariants and rounding in `HANDOFF.md` §3, which moves to `docs/HANDOFF.md` in Task 1). The product spec rev 18 was not available; the test IDs T09, T10, T28, T29 are cited from `HANDOFF.md` only, and their exact fixtures here are this plan's own.

## Global Constraints

- License Apache-2.0; every internal package is `"license": "Apache-2.0"`; dependencies MIT/Apache/BSD only.
- Package scope `@hisabna/*`; internal dependencies use `workspace:*`; shared dependency versions live in the pnpm catalog in `pnpm-workspace.yaml`.
- Layout is flat: only `apps/*` and `packages/*` workspaces.
- Money is integers in the currency's smallest unit, 64-bit: use `bigint`. Never floating point. QAR 2 decimals, KWD/BHD/OMR 3, JPY 0.
- Max amount 9,999,999 major units.
- `money` and `ledger` import no framework and no `node:*` module, and use no `parseFloat` or `Math.*` (enforced by lint, Task 10).
- Per entry: Σpaid = Σowed = total. Accept only if all three are equal.
- Equal split: `floor(total / people)`; leftover units go to the largest payer who is in the split (ties by member order); if no payer is in the split, one unit each to the first people in member order.
- Percent and Shares: round each share half-up; the difference (positive or negative) goes to the largest payer in the split, else to the person with the largest share (ties by member order by index).
- Simplify debts: greedy, largest debtor with largest creditor (ties by join order), at most n-1 transfers per currency, no member's net changes.
- Reject an entry if any `paid` or `owed` is negative.
- Calling `parseAmount` with more decimals than the currency allows is an error, never a silent round.

## Review Focus

1. Arabic-Indic digits and the Arabic decimal separator typed into an amount ("١٠٠٫٥٠") must parse as 100.50. Pinned in Task 3.
2. A total smaller than the number of people (QAR 0.01 split three ways) must give one person the cent and the others 0, never a negative share. Pinned in Task 5.
3. A payer who is not in the split (A pays for B, C, D) must still balance and give the leftover to the first member. Pinned in Task 5.
4. "10.005" in QAR and "9999999.001" in KWD must be rejected, not rounded or accepted. Pinned in Tasks 2 and 3.
5. The same person listed twice, or an unknown person in `payments`, must be rejected. Pinned in Task 4.

---

### Task 1: Monorepo scaffold, licence and CI

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`, `.nvmrc` (`22`), `LICENSE` (Apache-2.0 full text), `NOTICE`, `CONTRIBUTING.md` (DCO sign-off rule), `.github/workflows/ci.yml`
- Create: `packages/config-ts/{package.json,base.json}`, `packages/config-eslint/{package.json,index.js}`
- Move: `HANDOFF.md` to `docs/HANDOFF.md`

**Interfaces:**
- Produces: root scripts `test`, `typecheck`, `lint` that run `turbo run <task>`; `@hisabna/config-ts/base.json` (strict, `"target": "ES2022"`, `"module": "ESNext"`, `"moduleResolution": "Bundler"`, `noUncheckedIndexedAccess: true`); `@hisabna/config-eslint` default export flat config.

- [ ] **Step 1:** Run `git init` in the repo root and commit `docs/` and `HANDOFF.md` move as the first commit.
- [ ] **Step 2:** Create `pnpm-workspace.yaml` with `packages: [apps/*, packages/*]` and a `catalog:` entry for `typescript`, `vitest`, `fast-check`, `eslint`, `typescript-eslint`, using the latest stable versions when you run this, recorded exactly.
- [ ] **Step 3:** Create `turbo.json` with tasks `test`, `typecheck`, `lint` (no caching of outputs needed; `test` depends on nothing).
- [ ] **Step 4:** Create the two config packages and the license files. `CONTRIBUTING.md` states every commit needs `Signed-off-by` (DCO).
- [ ] **Step 5:** Create `.github/workflows/ci.yml` that on push and pull request runs `pnpm install --frozen-lockfile` then `pnpm turbo run lint typecheck test` on Node 22.
- [ ] **Step 6:** Run `pnpm install && pnpm -r list --depth -1`. Expected: both config packages listed, no errors.
- [ ] **Step 7:** Commit `chore: scaffold monorepo`.

### Task 2: `money` currencies and limits

**Files:**
- Create: `packages/money/{package.json,tsconfig.json,vitest.config.ts}`, `packages/money/src/currency.ts`, `packages/money/src/index.ts`
- Test: `packages/money/test/currency.test.ts`

**Interfaces:**
- Produces:
  - `type CurrencyCode = 'QAR' | 'SAR' | 'AED' | 'KWD' | 'BHD' | 'OMR' | 'JPY' | 'USD'`
  - `decimalsOf(code: CurrencyCode): 0 | 2 | 3`
  - `maxMinor(code: CurrencyCode): bigint` (9,999,999 major units in minor units)
  - `isAmountInRange(minor: bigint, code: CurrencyCode): boolean` (0 < minor <= maxMinor)

- [ ] **Step 1: Write failing tests** in `currency.test.ts`: `decimalsOf('QAR') === 2`, `decimalsOf('KWD') === 3`, `decimalsOf('BHD') === 3`, `decimalsOf('OMR') === 3`, `decimalsOf('JPY') === 0`; `maxMinor('QAR') === 999999900n`; `maxMinor('KWD') === 9999999000n`; `maxMinor('JPY') === 9999999n`; `isAmountInRange(0n,'QAR') === false`; `isAmountInRange(999999900n,'QAR') === true`; `isAmountInRange(999999901n,'QAR') === false`.
- [ ] **Step 2:** Run `pnpm --filter @hisabna/money test`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement `currency.ts` and export from `index.ts`. A lookup table keyed by code; `maxMinor` is `9999999n * 10n ** BigInt(decimals)`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(money): currencies and amount limits`.

### Task 3: `money` parse and format

**Files:**
- Create: `packages/money/src/parse.ts`, `packages/money/src/format.ts`
- Modify: `packages/money/src/index.ts`
- Test: `packages/money/test/parse.test.ts`, `packages/money/test/format.test.ts`

**Interfaces:**
- Consumes: `decimalsOf`, `maxMinor`.
- Produces:
  - `parseAmount(input: string, code: CurrencyCode): bigint` throws `MoneyError`
  - `formatMinor(minor: bigint, code: CurrencyCode): string` (plain Latin digits, `.` separator, fixed decimals, leading `-` if negative)
  - `class MoneyError extends Error { code: 'INVALID_AMOUNT' | 'TOO_MANY_DECIMALS' | 'OUT_OF_RANGE' }`

- [ ] **Step 1: Write failing tests.**
  - `parseAmount('100.50','QAR') === 10050n`; `parseAmount('100','QAR') === 10000n`; `parseAmount('1.000','KWD') === 1000n`; `parseAmount('500','JPY') === 500n`; `parseAmount(' 12.5 ','QAR') === 1250n` (trims).
  - Arabic digits: `parseAmount('١٠٠٫٥٠','QAR') === 10050n` (Arabic-Indic digits and `٫`); `parseAmount('100,50','QAR')` throws `INVALID_AMOUNT` (comma is not accepted).
  - `parseAmount('10.005','QAR')` throws `TOO_MANY_DECIMALS`; `parseAmount('1.5','JPY')` throws `TOO_MANY_DECIMALS`.
  - `parseAmount('9999999.001','KWD')` and `parseAmount('10000000','QAR')` throw `OUT_OF_RANGE`; `parseAmount('0','QAR')` throws `OUT_OF_RANGE`.
  - `parseAmount('abc','QAR')`, `''`, `'-5'`, `'1e3'` throw `INVALID_AMOUNT`.
  - `formatMinor(10050n,'QAR') === '100.50'`; `formatMinor(1n,'KWD') === '0.001'`; `formatMinor(-3333n,'QAR') === '-33.33'`; `formatMinor(500n,'JPY') === '500'`.
- [ ] **Step 2:** Run `pnpm --filter @hisabna/money test`. Expected: FAIL.
- [ ] **Step 3:** Implement. `parseAmount`: normalize Arabic-Indic digits (U+0660-0669) and `٫` to ASCII with a lookup table, trim, validate with one regex `^\d+(\.\d+)?$`, then build the bigint from the digit string. No numeric parsing.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(money): exact amount parse and format`.

### Task 4: `ledger` types and entry validation

**Files:**
- Create: `packages/ledger/{package.json,tsconfig.json,vitest.config.ts}`, `packages/ledger/src/errors.ts`, `packages/ledger/src/types.ts`, `packages/ledger/src/validate.ts`, `packages/ledger/src/index.ts`
- Test: `packages/ledger/test/validate.test.ts`

**Interfaces:**
- Consumes: `CurrencyCode`, `isAmountInRange` from `@hisabna/money`.
- Produces:
  - `type PersonId = string`
  - `type EntryShare = { personId: PersonId; paid: bigint; owed: bigint }`
  - `type Payment = { personId: PersonId; paid: bigint }`
  - `type Allocation = { personId: PersonId; owed: bigint }`
  - `type LedgerEntry = { id: string; currency: CurrencyCode; deleted: boolean; shares: EntryShare[] }`
  - `class LedgerError extends Error { code: 'NOT_BALANCED' | 'AMOUNT_NOT_POSITIVE' | 'AMOUNT_OUT_OF_RANGE' | 'DUPLICATE_PERSON' | 'NEGATIVE_SHARE' | 'EMPTY_ENTRY' | 'UNKNOWN_PERSON' | 'BAD_INPUT' }`
  - `buildEntryShares(owed: Allocation[], payments: Payment[]): EntryShare[]` (union of people; missing side is 0n; throws `DUPLICATE_PERSON` if a person repeats within owed or within payments)
  - `validateEntry(total: bigint, shares: EntryShare[], currency: CurrencyCode): void` throws `LedgerError`

- [ ] **Step 1: Write failing tests.**
  - Valid: total 10000n, shares `[{A,paid 10000n,owed 3334n},{B,0n,3333n},{C,0n,3333n}]` QAR does not throw.
  - `NOT_BALANCED` for each of: Σpaid=10000 but Σowed=9999; Σowed=10000 but Σpaid=9999; Σpaid=Σowed=10001 with total 10000 (this pins the corrected rule: all three must be equal).
  - `AMOUNT_NOT_POSITIVE` for total 0n; `AMOUNT_OUT_OF_RANGE` for total `maxMinor('QAR') + 1n`; `NEGATIVE_SHARE` for `owed: -1n`; `EMPTY_ENTRY` for `shares: []`.
  - `buildEntryShares([{A,5000n},{A,5000n}], [])` throws `DUPLICATE_PERSON`; `buildEntryShares([{A,10000n}], [{B,10000n}])` returns two shares (A owed only, B paid only).
- [ ] **Step 2:** Run `pnpm --filter @hisabna/ledger test`. Expected: FAIL.
- [ ] **Step 3:** Implement. `validateEntry` checks in this order: empty, duplicates, negatives, total > 0, range, then `Σpaid === total && Σowed === total`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(ledger): entry types and invariant 1 validation`.

### Task 5: Equal split

**Files:**
- Create: `packages/ledger/src/split/remainder.ts`, `packages/ledger/src/split/equal.ts`
- Modify: `packages/ledger/src/index.ts`
- Test: `packages/ledger/test/split-equal.test.ts`

**Interfaces:**
- Consumes: `Allocation`, `Payment`, `PersonId`, `LedgerError`.
- Produces:
  - `largestPayerIn(members: PersonId[], payments: Payment[]): PersonId | null` (largest `paid` among payers who are in `members`; ties by index in `members`)
  - `splitEqual(total: bigint, members: PersonId[], payments: Payment[]): Allocation[]` (output order equals `members` order; Σowed = total)

- [ ] **Step 1: Write failing tests** (members/payments in the order given):
  - T09: total 10000n, members `[A,B,C]`, payments `[{C,10000n}]` → owed `[3333n,3333n,3334n]`.
  - T10: total 1000n (KWD 1.000), same members, payer C → `[333n,333n,334n]`.
  - Four-person dinner: total 40000n, members `[A,B,C,D]`, payments `[{A,7500n},{B,3000n},{C,29500n},{D,0n}]` → every owed `10000n`.
  - Multiple payers, leftover to the largest: total 10000n, members `[A,B,C]`, payments `[{A,6000n},{B,4000n}]` → `[3334n,3333n,3333n]`.
  - Payer not in the split: total 10000n, members `[B,C,D]`, payments `[{A,10000n}]` → `[3334n,3333n,3333n]`.
  - Tiny total: total 1n, members `[A,B,C]`, payments `[{B,1n}]` → `[0n,1n,0n]`.
  - Tiny total, payer not in split: total 2n, members `[B,C,D]`, payments `[{A,2n}]` → `[1n,1n,0n]` (one unit each to the first people).
  - Throws `DUPLICATE_PERSON` for repeated members, `BAD_INPUT` for an empty `members`.
- [ ] **Step 2:** Run `pnpm --filter @hisabna/ledger test`. Expected: FAIL.
- [ ] **Step 3:** Implement with `bigint` division. When a payer is in the split all leftover units go to the largest payer; otherwise one unit each to members in order.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(ledger): equal split with remainder rules`.

### Task 6: Exact, Percent, Shares and Adjustment splits

**Files:**
- Create: `packages/ledger/src/split/exact.ts`, `percent.ts`, `shares.ts`, `adjustment.ts`
- Modify: `packages/ledger/src/index.ts`
- Test: `packages/ledger/test/split-methods.test.ts`

**Interfaces:**
- Consumes: `splitEqual`, `largestPayerIn`, types from Task 4.
- Produces:
  - `splitExact(total: bigint, amounts: Allocation[]): Allocation[]` throws `NOT_BALANCED` if Σ ≠ total
  - `splitPercent(total: bigint, percents: { personId: PersonId; basisPoints: number }[], payments: Payment[]): Allocation[]` (`basisPoints` are integers, 10000 = 100%; must sum to 10000 else `BAD_INPUT`)
  - `splitShares(total: bigint, weights: { personId: PersonId; weight: number }[], payments: Payment[]): Allocation[]` (weights positive integers)
  - `splitAdjustment(total: bigint, members: PersonId[], adjustments: Allocation[], payments: Payment[]): Allocation[]` where an adjustment is an extra amount that person owes (may be negative as a signed `bigint` in `owed`); the remainder `total - Σadjustments` is split equally with `splitEqual`, then each adjustment is added. **My call, unconfirmed:** the handbook's Adjustment definition was not available; confirm against the spec. Result must have no negative owed or throws `NEGATIVE_SHARE`.

- [ ] **Step 1: Write failing tests.**
  - Exact: `splitExact(10000n,[{A,2500n},{B,7500n}])` returns the same; `[{A,2500n},{B,7000n}]` throws `NOT_BALANCED`.
  - Percent, exact division: total 10000n, bps `[A 5000, B 2500, C 2500]` → `[5000n,2500n,2500n]`.
  - Percent, rounding over: total 1001n, bps `[A 5000, B 5000]`, payments `[{A,1001n}]` → `[500n,501n]` (each rounds half-up to 501, difference -1 comes off the payer).
  - Percent, no payer in split: total 1001n, bps `[A 5000, B 5000]`, payments `[{C,1001n}]` → `[500n,501n]` (A and B tie on share, difference -1 goes to the first, A).
  - Percent bad sum: bps summing to 9999 throws `BAD_INPUT`.
  - Shares exact: total 10000n, weights `[A 2, B 1, C 1]` → `[5000n,2500n,2500n]`.
  - Shares rounding under: total 100n, weights `[A 1, B 1, C 1]`, payments `[{C,100n}]` → `[33n,33n,34n]`.
  - Adjustment: total 10000n, members `[A,B,C]`, adjustments `[{A,1000n}]`, payments `[{A,10000n}]` → `[4000n,3000n,3000n]`.
  - Adjustment making someone negative: adjustments `[{A,-9000n}]` with total 10000n, members `[A,B]` → remainder 19000 split to 9500 each, A = 500 (valid). And `[{A,-20000n}]` throws `NEGATIVE_SHARE`.
  - Every method's output has Σowed = total in all tests above.
- [ ] **Step 2:** Run `pnpm --filter @hisabna/ledger test`. Expected: FAIL.
- [ ] **Step 3:** Implement. Half-up rounding in integers: `(2n * total * w + W) / (2n * W)` with truncating bigint division. Apply the leftover difference to `largestPayerIn(...)`, else to the largest allocation (first on ties).
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(ledger): exact, percent, shares and adjustment splits`.

### Task 7: Balance engine

**Files:**
- Create: `packages/ledger/src/balance.ts`
- Modify: `packages/ledger/src/index.ts`
- Test: `packages/ledger/test/balance.test.ts`

**Interfaces:**
- Consumes: `LedgerEntry`, `PersonId`, `CurrencyCode`.
- Produces:
  - `computeNets(entries: LedgerEntry[]): Map<CurrencyCode, Map<PersonId, bigint>>` (skips `deleted` entries; net = Σ(paid - owed))
  - `assertZeroSum(nets: Map<PersonId, bigint>): void` throws `LedgerError('NOT_BALANCED')` if Σ ≠ 0 (invariant 2)

- [ ] **Step 1: Write failing tests.**
  - The QAR 100 dinner (A paid 10000n, owed 3334n; B, C owed 3333n) → A `+6666n`, B `-3333n`, C `-3333n`.
  - The four-person dinner → A `-2500n`, B `-7000n`, C `+19500n`, D `-10000n`.
  - Two currencies in one group (QAR entry and KWD entry) → two separate maps, each zero-sum.
  - A `deleted: true` entry changes nothing. Restoring it (`deleted: false`) brings the nets back.
  - `assertZeroSum` passes on the maps above and throws on a hand-made map summing to 1n.
- [ ] **Step 2:** Run `pnpm --filter @hisabna/ledger test`. Expected: FAIL.
- [ ] **Step 3:** Implement `computeNets` and `assertZeroSum`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(ledger): balance engine`.

### Task 8: Simplify debts

**Files:**
- Create: `packages/ledger/src/simplify.ts`
- Modify: `packages/ledger/src/index.ts`
- Test: `packages/ledger/test/simplify.test.ts`

**Interfaces:**
- Consumes: `PersonId`, `assertZeroSum`.
- Produces:
  - `type Transfer = { from: PersonId; to: PersonId; amount: bigint }`
  - `simplifyDebts(nets: Map<PersonId, bigint>, joinOrder: PersonId[]): Transfer[]` (throws `NOT_BALANCED` if the nets do not sum to 0; throws `UNKNOWN_PERSON` if a person is missing from `joinOrder`)

- [ ] **Step 1: Write failing tests.**
  - T28 (this plan's fixture): nets Ali `+40n`, Omar `+10n`, Sara `-30n`, Noor `-20n`, joinOrder `[Ali,Sara,Omar,Noor]` → `[{Sara→Ali 30n},{Noor→Ali 10n},{Noor→Omar 10n}]`.
  - Four-person dinner nets (A -2500, B -7000, C +19500, D -10000), joinOrder `[A,B,C,D]` → `[{D→C 10000n},{B→C 7000n},{A→C 2500n}]`.
  - All-zero nets → `[]`. A single person with net 0 → `[]`.
  - Tie on equal debtors: nets X `-10n`, Y `-10n`, Z `+20n`, joinOrder `[X,Y,Z]` → `[{X→Z 10n},{Y→Z 10n}]`.
  - Applying the returned transfers to the nets (from +amount, to -amount) leaves every net at 0n, and `transfers.length <= n - 1`.
- [ ] **Step 2:** Run `pnpm --filter @hisabna/ledger test`. Expected: FAIL.
- [ ] **Step 3:** Implement the greedy loop: repeatedly pick the largest remaining debtor and largest remaining creditor (ties by index in `joinOrder`), transfer `min` of the two, until all are 0n.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(ledger): simplify debts`.

### Task 9: Property-based invariant tests

**Files:**
- Create: `packages/ledger/test/properties.test.ts`, `packages/ledger/test/arbitraries.ts`

**Interfaces:**
- Consumes: everything from Tasks 2-8.
- Produces: `arbitraries.ts` exporting `arbEntry` (random currency, 2-8 people, random payers with amounts summing to the total, one of the five split methods).

- [ ] **Step 1: Write the properties** (each runs at least 1000 cases):
  1. Invariant 1: every entry built by any split method + `buildEntryShares` passes `validateEntry`.
  2. Invariant 2: for random lists of entries per currency, `computeNets` is zero-sum, including after randomly marking entries deleted and restoring them.
  3. Invariant 3: every generated amount is within range, and `parseAmount(formatMinor(x, c), c) === x`.
  4. Invariant 6: `simplifyDebts` returns at most n-1 transfers, every transfer amount is positive, and applying them zeros every net.
  5. Equal split: the largest and smallest owed differ by at most the leftover count, and Σowed = total.
  6. Percent and Shares: each owed is within 1 unit of the exact fraction, unless the leftover difference lands on one person, in which case that person is within `n` units.
- [ ] **Step 2:** Run `pnpm --filter @hisabna/ledger test`. Expected: PASS. If a property fails, record the shrunk counterexample, fix the split code, and add that counterexample as a plain example test in the owning task's test file.
- [ ] **Step 3:** Commit `test(ledger): property-based invariant suite`.

### Task 10: Lint rules and licence check

**Files:**
- Modify: `packages/config-eslint/index.js`
- Create: `scripts/check-licenses.mjs`
- Modify: `.github/workflows/ci.yml`
- Test: a deliberately bad fixture `packages/money/test/lint-fixture.bad.ts` is not committed; verify by hand in Step 2.

**Interfaces:**
- Produces: an ESLint config for `packages/money/**` and `packages/ledger/**` that errors on `parseFloat`, any `Math.*` member, `Number(` on a non-literal, and any import from `node:*` or `fs`, `path`, `crypto`; and `scripts/check-licenses.mjs` that fails when `pnpm licenses list --json` shows a licence outside the allowlist `MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, BlueOak-1.0.0, CC0-1.0, Python-2.0`.

- [ ] **Step 1:** Add the rules to the shared ESLint config and wire `lint` scripts into both packages.
- [ ] **Step 2:** Temporarily add `const x = Math.floor(1.5)` to `packages/money/src/currency.ts`, run `pnpm turbo run lint`, and confirm it fails. Remove the line and confirm it passes.
- [ ] **Step 3:** Write `check-licenses.mjs`, add a `license-check` step to `ci.yml`, and run `node scripts/check-licenses.mjs`. Expected: exit 0.
- [ ] **Step 4:** Run `pnpm turbo run lint typecheck test`. Expected: all pass.
- [ ] **Step 5:** Commit `chore: lint rules for pure packages and licence check`.

---

## Done when

- `pnpm turbo run lint typecheck test` passes from a clean checkout and in CI.
- The T09 and T10 examples, the four-person dinner and the Simplify fixtures pass.
- The property suite passes with at least 1000 runs per property.
- `money` and `ledger` have no framework or Node-only imports.

## Not in this plan

Database, API, auth, apps, web, sync, i18n and providers. Each gets its own plan. The product spec rev 18 is still needed before acceptance tests for T01-T50 can be written.
