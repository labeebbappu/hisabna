# Hisabna MVP: Technical Design

Date: 2026-11-27
Status: DRAFT, decisions recorded 2026-11-27, awaiting developer approval of this document
Inputs: `HANDOFF.md` (handbook v1.0, spec rev 18; spec not available, nothing here is checked against it)

## 1. Intent and why

Hisabna is a free, bilingual (Arabic RTL / English LTR) group expense-splitting app for Qatar and the GCC. It **records** debts and never holds or moves money; settling happens in the bank app or Fawran.

The developer wants **full ownership** of the code and an **open-source** project. So the system must be self-hostable end to end, with no dependency on a proprietary hosted platform.

The one measurable MVP success rule is **zero balance-mismatch bugs over a 4-week closed beta (~200 users, Qatar)**. The design is shaped around that: money logic is written once and shared, and invariants are enforced and monitored.

## 2. Goals, non-goals, anti-goals

**Goals**
- Ship the MVP scope in HANDOFF.md §2 (iOS, Android, web guest join, backend).
- Money correctness provable by property-based tests and a production invariant monitor.
- Everything runs from `docker compose up`; hosting is movable between GCC clouds by config.
- Arabic and English equal from day one (i18n/RTL is not retrofitted).

**Non-goals (v1, per handbook)**
Receipt scan, recurring, multi-currency conversion, search, totals/charts, export, Splitwise import, reminders, whiteboard, lock mode, Viewer role, account delete/merge, Hijri dates.

**Anti-goals (a failure even if it technically works)**
- Any floating-point money.
- Any ads, paywall, Pro badge or upsell (T49).
- Any core code that imports a hosted-platform SDK (Firebase, Supabase, etc.).
- Client and server computing a split or balance differently.

## 3. Constraints

- License: **Apache-2.0** (developer's decision). Contributions need a CLA or at least DCO sign-off, or the developer cannot relicense later. The name "Hisabna" is protected separately by trademark, not by the code license.
- Dependencies: MIT/Apache/BSD/ISC etc. for production (shipped) dependencies; dev-only build/test tooling may additionally use MPL-2.0 (weak file-level copyleft, not shipped); checked in CI by `pnpm licence-check`.
- Data location: hosting inside the GCC (region not chosen yet). Qatar Law 13 of 2016 review pending.
- Stack is TypeScript end to end so core logic can be shared.

## 4. Approaches considered

| | A. Next.js as API + Postgres | **B. Separate Node API + worker + Postgres (chosen)** | C. Supabase/Firebase |
|---|---|---|---|
| Speed to start | Fastest | A little more setup | Fastest |
| Background jobs (push batching, quiet hours, sync) | Bolted on | Built in | Platform-specific |
| Ownership / self-hosting | Good | Good | Poor: logic lives in platform policies |
| GCC data location | Any | Any | No Qatar region |
| Verdict | Viable, but couples API and web releases | Chosen | Rejected: fails ownership and data location |

**Chosen: B**, because push batching, quiet hours and offline sync need real background jobs, and a separate API keeps mobile and web clients equal citizens.

## 5. Architecture

Monorepo (pnpm workspaces + Turborepo), approved by the developer 2026-11-27. Layout is flat: `apps/*` and `packages/*` only (Turborepo does not support nested workspace globs). Apps sit at the end of the dependency graph and nothing depends on them. Internal packages use the `@hisabna/*` scope and the `workspace:*` protocol; shared dependency versions live in a pnpm catalog.

```
hisabna/
├─ apps/
│  ├─ mobile/            Expo (React Native), iOS + Android
│  ├─ web/               Next.js: guest join page, invite landing
│  ├─ api/               Fastify HTTP API
│  └─ worker/            Background jobs (push batching, OTP, cleanup, invariant monitor)
├─ packages/
│  ├─ money/             Integer minor-unit math, per-currency decimals, formatting
│  ├─ ledger/            Split engine (5 methods + multi-payer), balance engine, simplify-debts, invariants
│  ├─ schema/            Shared types, validation (zod), API contract
│  ├─ db/                Postgres migrations and queries (shared by api + worker)
│  ├─ sync/              Offline queue and merge rules (mobile + web)
│  ├─ i18n/              Arabic/English catalogue, plural rules (Arabic has 6 forms)
│  ├─ providers/         OtpProvider, PushProvider, ObjectStore interfaces + adapters
│  ├─ config-ts/         Shared tsconfig
│  └─ config-eslint/     Shared lint rules
├─ infra/                docker-compose, Dockerfiles
├─ docs/                 Design docs, ADRs, handoff
├─ pnpm-workspace.yaml
├─ turbo.json
├─ package.json          (private)
├─ LICENSE               Apache-2.0
├─ NOTICE
└─ CONTRIBUTING.md       DCO sign-off (pending, see §9)
```

**Layout notes (builder's call, marked)**
- `db` and `providers` are separate packages because both `api` and `worker` need them; duplicating that code is the alternative.
- `money` and `ledger` import no framework or Node-only APIs, so they run on phone, web and server. A lint rule enforces this.
- Expo setup: start from the official guide with `expo/metro-config`. Add pnpm symlink / watch-folder settings only if Metro fails to resolve packages (the SDK-specific need is unconfirmed).
- `infra/` and `docs/` are root folders, not workspace packages.

**Key decisions**
- **Database:** PostgreSQL. Money columns are `bigint` minor units. Invariants 1–3 and 5 are enforced with constraints/triggers where possible and always in the service layer.
- **Shared engine:** `packages/money` and `packages/ledger` run unchanged on mobile, web and server. The server is authoritative: it recomputes and rejects any entry that fails validation.
- **Job queue:** Postgres-backed (e.g. pg-boss), so there is no extra infrastructure to host.
- **Pluggable providers behind interfaces:** `OtpProvider` (SMS/WhatsApp), `PushProvider` (APNs/FCM), `ObjectStore`. The core never names a vendor.
- **Mobile builds:** Expo framework is used; Expo's paid build service (EAS) is optional, local builds must work.
- **Sign-in:** phone OTP, Google, Apple via standard OIDC, plus guest identities (device or browser).

## 6. Data model (corrections to the handbook drawing)

Built on the share-ledger design in HANDOFF.md §3, with these fixes decided now:
- **Participant** table (a user or a placeholder) is the target of `EntryShare`, so non-group entries (`group_id` = null) have somewhere to point.
- **Friendship** gets a status (pending/accepted).
- **GuestSession** table (token, expiry, revoked_at, linked participant).
- **Per-user flags** (pin, mute, archive) move to a `MemberPrefs` table; `Group.archived_at` stays group-wide.
- Balances are never stored; they are computed from `EntryShare`.

## 7. Rules locked in by this design

These tighten wording that was wrong or incomplete in the handbook:
1. An entry is accepted only if Σpaid = Σowed = total, and it involves at least 2 different people (`SINGLE_PERSON` otherwise; handbook T17, lines 2608-2611, 5282). Check order in `validateEntry` (**provisional**, follows the handbook flow at lines 2608-2617): empty, duplicate person, negative share, total > 0, range, then `SINGLE_PERSON`, then `NOT_BALANCED`. So `[Ali paid 9999, owed 10000]` is `SINGLE_PERSON`. Only shares with a non-zero paid or owed amount count as people; all-zero rows are ignored, not rejected.
2. **Remainder algorithm** (Equal, Percent, Shares, Adjustment). **PROVISIONAL**: these rules are the builder's choice and must be confirmed or replaced when product spec rev 18 is available. Terms: `total` is the amount in minor units; "payer" means a person with `paid > 0`; "in the split" means listed in the split input; ties are broken by member (list) order. Every test case names the rule it exercises.
   - **Equal** (n people in the split):
     1. Every person gets `floor(total / n)`; `leftover = total mod n`.
     2. The whole `leftover` goes to the largest payer in the split (ties by member order).
     3. If nobody in the split paid, one unit each goes to the first `leftover` members.
   - **Percent and Shares** (weights `w`, sum `W`; for Percent, `W` = 10000 basis points; a Percent or Shares weight may be 0, but `W` must be > 0. **PROVISIONAL** for Shares: a weight is a whole number, or a decimal string with at most 2 decimals, `^[0-9]+(\.[0-9]{1,2})?$`, converted exactly to hundredths; number weights must be integers, so `2.5` is `'2.5'`. The handbook (lines 5176, 2717) allows decimal shares but gives no cap; 2 decimals matches the percent input rule at line 5173):
     1. Each person gets `rounded = (2*total*w + W) / (2*W)` (integer division, half-up). A person with `w = 0` gets 0.
     2. `diff = total - Σ rounded`.
     3. If `diff = 0`, stop.
     4. The **primary target** is the largest payer in the split among people with `w > 0` (ties by member order). If there is none, it is the person with `w > 0` and the largest `rounded` (first on ties). People with `w = 0` are never the target.
     5. If `rounded(target) + diff >= 0`, add `diff` to the target and stop.
     6. Otherwise (only possible when `diff < 0`) the target is not given the diff, but stays eligible for removal like everyone else. Order the people with `w > 0` and `rounded > 0` by rounding excess `rounded*W - total*w` descending (ties by list index) and remove one unit from each, in that order, until `|diff|` units are removed. One pass is always enough, and nobody goes below 0.
   - **Adjustment** (**PROVISIONAL**: the handbook gives no worked example; line 5179 only requires each result >= 0): each adjustment is a signed extra amount one person owes. `remainder = total - Σadjustments` is signed. If `remainder >= 0` it is split with the Equal rules and the adjustments are added. If `remainder < 0`, `|remainder|` is split with the Equal rules and subtracted (the payer, who gets the leftover, gets the larger reduction), then the adjustments are added. Any final amount < 0 is `NEGATIVE_SHARE` (T15). Example: total 10000, A +6000, B +6000 gives 5000 / 5000. **Payer fallback (PROVISIONAL):** if giving the payer the leftover would make any final result < 0 (a payer absorbing a negative remainder, or a negative adjustment next to an odd unit), the no-payer rule is used instead: one unit each to the first members in member order. Example: total 10000, A +1, B +6000, C +4001, A paid: remainder -2, A would go to -1, so A 0 / B 5999 / C 4001. The payer keeps the larger reduction whenever it can absorb it.
   - **Input order**: callers must pass members in group join order (`Member.joined_at`, handbook line 1031) to Equal, Percent, Shares, Adjustment and Simplify; ties and "first in member order" depend on it.
   - **Amount parsing errors** (`@hisabna/money`): `INVALID_AMOUNT`, `TOO_MANY_DECIMALS`, then `AMOUNT_NOT_POSITIVE` (zero) and `AMOUNT_TOO_LARGE` (above the maximum), checked in that order. These replace the old single `OUT_OF_RANGE`.
3. Amount, `paid_by`, `split_method`, `split_input` and shares merge as **one unit** and are revalidated after every merge.
4. Conflicting edits to money fields (builder's call, changed after review): the server rejects a stale write to any money field and the user reviews both versions; the rejection is logged. Non-money fields merge automatically, logged, other author notified (T39). Reason: last-write-wins lets a stale offline edit silently overwrite a newer one, the main threat to zero balance-mismatch bugs.
5. Placeholder claims need **Owner approval** (decided, see §9), plus an Owner "release identity" action.
6. Activity log is append-only; merging repeat edits within 60 s happens in a buffer before the write.
7. Invariant 4 is checked in **every** currency, and entry restore re-checks it.

## 8. Build order

1. `money` + `ledger` packages with property-based tests for invariants 1–3, 6, 7 (T09–T17, T28, T29). No decisions needed, start here.
2. DB schema + migrations + Entry API (idempotent create, versioning, roles, soft delete/restore).
3. Auth (OTP, Google, Apple, guest), groups, placeholders.
4. Mobile shell with i18n/RTL; group and expense screens.
5. Balances and settle-up (record, confirm, dispute).
6. Web guest join and session.
7. Activity feed, push batching, offline sync.
8. Rate limits, invariant monitor, full test gate in both languages, 4-week beta.

## 9. Left to the builder / still open

**Decisions (developer said "go with your picks", 2026-11-27):**
- **Friends tab and non-group expenses: NOT in the MVP**, fast follow after launch. `group_id` stays required in the MVP schema. The Participant table (§6) is still designed in now so the later migration is additive. Screens S-FRD-01..03 and handbook §6.8 (Friends vs Balances copy) move to the follow-up. This replaces the handbook's assumption that Friends is in scope.
- **Browser guests cannot record payments.** They can view balances and add expenses; recording a payment requires signing up. Guest upgrade (T04, T05) must carry their data over.
- **Placeholder claims need Owner approval**, plus an Owner "release identity" action.
- **T22 (Viewer) and T23 (lock mode) are dropped from the MVP exit gate.** Roles are Owner and Editor only. Viewer and lock mode stay v1. The 403 checks (T24) still apply.
- **1 year wins over the 30-day group purge.** A deleted group is hidden and unrestorable after 30 days, but its entries are kept until 1 year after deletion. Invariant 5 holds.
- **Disputed payments and leavers' debts:** the payee or an Owner can void a payment; the voided payment stays in the log and is never hard-deleted. An Owner can record a write-off entry for a member leaving with a non-zero net; it is a normal ledger entry, so invariant 2 still holds.
- **Contributor terms: DCO sign-off.** A CLA can be added later if relicensing becomes a goal.

**Still open:**
- **Product spec (rev 18) or handbook PDF not available.** Test IDs (T01-T50) and flows (PF-01..28) are known only from HANDOFF.md. Acceptance tests and screen behaviour cannot be written until it is supplied. Steps 1 and 2 of the build order do not depend on it.
- **OTP provider and hosting region** are not chosen. Both block step 3 (auth) and step 8 (hardening), not step 1.
- **Funding model** for SMS cost is undecided; it affects how strict OTP send limits must be.

**Builder's call:** ORM/query layer, test framework, state management in the apps, CI provider, exact job-queue library.

## 10. Questions for the next plans

1. **Wire format for money.** Decimal strings of minor units, parsed with a strict `^-?[0-9]+$` check before `BigInt` (`BigInt('')` is `0n`, `BigInt('0x1A')` is `26n`). Add `minorToWire` / `minorFromWire` before any endpoint. node-postgres returns `bigint` columns as strings.
2. **One dispatcher.** A single `computeEntry(method, splitInput, payments)` with a discriminated `SplitInput`, so clients and server cannot diverge.
3. **Persistence.** Store `split_method`, `split_input`, the computed shares and a split-algorithm version per entry.
4. **Product rule decisions needing spec rev 18.** Overshoot taken by the payer vs the largest share; whether Equal and Shares 1:1 must give identical odd-unit results; the definition of Adjustment (a working rule is in §7); whether a 0% person counts as in the split.
5. **`joinOrder` for Simplify.** Where it comes from (it must include members who left and placeholders), and how invariant 4 uses `computeNets` per currency.
6. **TS-source packages at runtime.** How Metro, Next.js and the Fastify/worker runtime resolve the `.js` import specifiers of TS-source packages; confirm Hermes `BigInt` support early.
7. **Error mapping.** From `MoneyError` / `LedgerError` codes to API errors and Arabic/English messages, and whether errors carry a `personId`. Note that money uses `AMOUNT_TOO_LARGE` / `AMOUNT_NOT_POSITIVE` while ledger uses `AMOUNT_OUT_OF_RANGE` / `AMOUNT_NOT_POSITIVE` for the same limits, so the mapping must cover both.
8. **Input caps.** Schema caps for weights and basis points, and a percent-input parser.
9. **Invariant monitor.** Where it runs, and which DB constraints mirror invariants 1-3.
10. **Participants.** Every person in `payments` or `owed` must be an active participant of the group; this is enforced in the API slice, not in `ledger`.

## 11. Handbook comparison (v1.0, 2026-11-27)

The handbook was compared with the code. Product spec rev 18 is still unavailable; the handbook says the spec wins where they differ.

**Matches (reproduced by tests in `packages/ledger/test/handbook.test.ts`):** chapter 2 worked example (all five expenses; nets Ali -73.33, Sara -43.34, Omar +116.67; simplified to 2 payments), T09, T10, T11, T15, T16, T17, T28 (2 suggested payments). T12, T13 and T14 are only rejected with generic codes (`NOT_BALANCED`, `NOT_BALANCED`, `BAD_INPUT`); the exact difference messages ('You are QAR 50.00 short.' etc.) are deferred (structured error data, below). The leftover cent goes to the person who paid (confirmed by the developer).

**Fixed in this wave:** T17 single-person entries rejected (`SINGLE_PERSON`); T16 decimal and zero Shares weights; Adjustment accepts Σadjustments above the total when every result is >= 0; `parseAmount` splits `OUT_OF_RANGE` into `AMOUNT_NOT_POSITIVE` / `AMOUNT_TOO_LARGE`; the §7 step 6 wording.

**Not yet implemented / deferred:**
- Full ISO 4217 currency table with verified decimals (line 5195). Wrong decimals would be a Critical bug, so this needs two independent sources.
- Structured error data for T12-T15 messages (lines 2618-2620, 5267-5276): needs the difference amount and `personId`; codes `PAID_MISMATCH` / `SPLIT_MISMATCH` / `PERCENT_NOT_100`.
- Pairwise debts when Simplify is off (line 3130, T29).
- Income/Refund (PF-15) and Transfer (PF-16) entry types.
- Rescale Exact amounts on edit (T18, lines 2940-2943).
- Base-currency conversion (v1).
- Description, notes and member limits (lines 5134, 5138, 5198).
- Percent input parser with 2 decimals (line 5173).
- Calculator expressions (line 5193).
- Digit display setting (line 3687).
- Invariant 2 is per group and currency, so callers must pass one group's entries (line 999).

**Needs the developer's decision:**
- §7.4 (reject stale money-field writes) contradicts handbook T39 "later arrival wins, other author notified" (lines 3002, 4155, 862-880).
- A payer at 0%: the handbook says the difference goes to the payer; the code excludes 0% people (unconfirmed, lines 3800, 2739).
- The handbook contradicts itself on the fallback target: PF-02 "largest share" (line 3800) vs S-EXP-SPLIT "first in member order" (line 2739). The code follows PF-02.
- The negative-diff spreading rule is not in the handbook (unconfirmed).
- T10 in the handbook reads 0.333 / 0.333 / 0.334 with no payer named; the engine gives the extra unit to the payer, so the result depends on who paid.

**Answers found in the handbook for §10:**
- Q3: persisted fields are `split_method` and `split_input` JSON plus `fx_rate_to_base` / `fx_rate_date` (lines 960, 1038-1040, 2778).
- Q4: the overshoot difference goes to the payer. The handbook never states whether Equal and Shares 1:1 must give identical results (it is only an inference that they need not); this stays open and needs spec rev 18, as in §10 Q4 and `docs/TRACKING.md`.
- Q5: join order comes from `Member.joined_at`; members who left must still be included (invariant 4).
- Q7: the exact messages are in lines 2618-2620 and 5267-5276.
- Q8: percent has 2 decimals, shares are whole or decimal, amount max is 9,999,999 major units, description 1-80, members <= 100.
