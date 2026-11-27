# Build tracking

Plan: docs/superpowers/plans/2026-11-27-money-ledger-core.md
Branch: work now flows through task branches into `dev` (see docs/WORKFLOW.md); tasks 1-9 landed before the split on `main`

| # | Task | Status | Commits |
|---|---|---|---|
| 1 | Monorepo scaffold, licence, CI | done, reviewed | 49b7d69, fd98cb6 |
| 2 | money: currencies and limits | done, reviewed | 1bd81c1 |
| 3 | money: parse and format | done, reviewed | 006cae7 |
| 4 | ledger: types and validation | done, reviewed | 2e0844c |
| 5 | Equal split | done, reviewed | e0b4dfd |
| 6 | Exact, Percent, Shares, Adjustment | done, reviewed | 26d2dde |
| 7 | Balance engine | done, reviewed | aba4622 |
| 8 | Simplify debts | done, reviewed | 08ab083 |
| 9 | Property-based invariant tests | done, reviewed | cd0a10f, c22c230 |
| 10 | Lint rules and licence check | done, reviewed | (this PR) |
| F | Final whole-branch review | done, reviewed | branch fix/final-review-fixes |

Open items:
- product spec rev 18 PDF; OTP provider; hosting region.
- commit 4eb8b1e (chore: add build tracking... on dev) lacks Signed-off-by: recorded exception; add a DCO check in CI (WORKFLOW.md follow-up).
- deferred from final review: Equal vs Shares 1:1 odd-unit rule (needs spec rev 18), percent-input parser, error context personId, CI `permissions: contents: read`.
- handbook v1.0 comparison, deferred (details in design doc §11):
  - full ISO 4217 table with verified decimals (line 5195)
  - structured error data for T12-T15 (PAID_MISMATCH / SPLIT_MISMATCH / PERCENT_NOT_100)
  - pairwise debts when Simplify is off (T29)
  - Income/Refund (PF-15) and Transfer (PF-16) entry types
  - rescale Exact amounts on edit (T18)
  - base-currency conversion (v1)
  - description/notes/member limits (lines 5134, 5138, 5198)
  - percent input parser with 2 decimals (line 5173)
  - calculator expressions (line 5193); digit display setting (line 3687)
  - developer decisions: §7.4 vs T39, 0% payer, fallback target (PF-02 vs S-EXP-SPLIT), negative-diff spreading
