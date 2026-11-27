# Design tracking

Branch: feat/design-tokens
Scope: English MVP first. Arabic and right-to-left are deferred, not dropped.
Mockups live in a private design canvas (not linked here). The design system is a private reference page. Both follow `packages/tokens`.

## Work items

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Palette: Ink `#101820` + Signal yellow `#FEE715` | done | Chosen over amber. Dark default, light theme. |
| 2 | `@hisabna/tokens` package | done | Typed tokens, generated `tokens.css`, 24 tests (contrast, CSS sync). Commit 983cfd9. |
| 3 | Design system reference page | done | Tokens, Button, TextField, AmountTag, cover. Private. |
| 4 | Mockups, first pass (S-IDs from HANDOFF.md) | done | 85 screens on the canvas. |
| 5 | Handbook check (92-page PDF vs mockups) | done, first pass | Four independent readers, one per screen area. |
| 6 | Fix round 1: wrong items | done | S-SET-01 picker added, rounding, exact wording, "recorded" not "paid", Delete moved, invite token. |
| 7 | Fix round 2: incomplete screens | done | Home, Add expense (+ more details), Expense detail, Activity, Account, Invite. |
| 8 | Fix round 3: blocked and error states | done | Exit-test states (T12-T14, T18, T31, T33) plus cheap handbook states. |
| 9 | Render check of every screen | not started | Nobody has looked at the rendered canvas yet. Check overflow and clipping. |
| 10 | Re-run handbook check on changed screens | not started | Use `screens.md` as the checklist. |
| 11 | Pull request into `dev` | not started | See `docs/WORKFLOW.md`. Branch was cut from `main`, so rebase on `origin/dev` first. |

## Decisions needed

The design spec overrides the handbook on these. The mockups follow the spec. Table is in `screens.md`.

| Topic | Needs a decision |
|---|---|
| Not-received payment | Void (spec) or Disputed and still counts (handbook) |
| Member leaves owing money | Owner write-off (spec) or removal blocked (handbook) |
| Claiming a placeholder name | Owner approves (spec) or claim at once (handbook) |
| Conflicting money edits | Review both versions (spec) or later write wins (handbook) |
| Guests recording payments | Not allowed (spec) or open (handbook) |

## Known gaps

- Split "Adjustment" blocked state (negative share) is not drawn.
- Linked cross-group payments (T34) belong to Friends, which is not in the MVP.
- Web guest rate-limit state is not drawn.
- Final wording must come from the text catalogue; mockup wording is a draft. Exact handbook strings are in `copy.md`.
- Mockup people and the IBAN are invented. The IBAN uses a fake bank code.
- Arabic: 7 screens exist, none planned until English is signed off.

## Files

- `docs/design/screens.md`: screen ID to mockup map, spec overrides, flows and states.
- `docs/design/copy.md`: exact copy from the handbook.
- `packages/tokens`: tokens source and generated CSS.
