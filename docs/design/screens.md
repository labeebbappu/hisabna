# MVP screen coverage

Every MVP screen ID has a mockup except the Friends screens. Maps each MVP screen ID (HANDOFF.md §4) to its mockup. Mockups are a design canvas (not in the repo); names below are the artboard titles. Screens use the `@hisabna/tokens` palette: Ink `#101820` with Signal yellow `#FEE715`, dark by default with a light theme.

Caveat: the handbook PDF was not available, so the mapping of S-SET-02 and the screen wording are assumptions to verify against it.

| ID | Screen | Mockup artboard(s) | Arabic (RTL) |
|---|---|---|---|
| S-ONB-01 | Splash and language | Welcome | no |
| S-ONB-02 | Sign-in | Sign in, Enter code, Wrong code | Sign in only |
| S-ONB-03 | Profile | Profile | no |
| S-ONB-04 | First action | First action | no |
| S-WEB-JOIN | Join from a link, no install | Web join, Guest upgrade | no |
| (PF-14) | Owner approves name claims and releases names | Approve name claims | no |
| S-HOME-01 | Home | Home, Home with no groups | Home |
| S-GRP-NEW | New group | New group | no |
| S-GRP-ADD | Add members | Add members | no |
| S-GRP-01 | Group | Group, Group offline queue | Group |
| S-GRP-INV | Invite | Invite | no |
| S-GRP-SET | Group settings | Group settings | no |
| S-EXP-01 | Add expense | Add expense | Add expense |
| S-EXP-SPLIT | Split options | Split options (Equal), Split: Exact amounts, Percent, Shares, Adjustment; Paid by: multiple payers | no |
| S-EXP-EDIT | Edit expense | Edit expense | no |
| S-EXP-02 | Expense detail | Expense detail | no |
| S-BAL-01 | Balances | Balances | Balances |
| S-SET-01 | Record payment | Record payment | Record payment |
| S-SET-02 | Payee confirm or dispute (assumed) | Confirm payment | no |
| S-ACT-01 | Activity | Activity | Activity |
| S-ACC-01 | Account | Account | no |

## Flows and states beyond the screen IDs

These are required by the design spec or the exit tests (T-numbers are from HANDOFF.md) and have their own mockups, all English only.

| Flow | Mockup |
|---|---|
| Conflicting edits to money fields (spec §7.5) | Review conflicting edits |
| Payee disputes or voids a payment (T33) | Dispute and void payment |
| OTP lockout after 5 wrong codes (T03) | Too many attempts, Wrong code, Code expired |
| No network at sign-in | Sign in, no network |
| Join by code, invite preview (first names only) | Join with code, Invite preview |
| Invalid invite, group full (100 members) | Invite not valid, Group is full |
| Owner write-off when a member leaves owing money | Remove member and write-off |
| Restore deleted entries (1 year) and groups (30 days) | Restore deleted items |
| Profile and payment details editing | Edit profile, Edit payment details |
| Notifications: permission, batching, quiet hours | Turn on notifications, Notification settings |
| Currency choice with 2- and 3-decimal examples | Currency picker |
| Pin, mute, archive from Home | Home, group menu |
| Change member role (Owner, Editor) | Change role |
| Confirm leave, delete group, sign out | Leave group, Delete group, Sign out |
| Balance with one person | Balance with a person |
| Pay by cash, bank transfer, or part of a debt | Settle: cash, Settle: bank transfer, Settle: part payment |
| App start and forced update | Splash, Update required |
| Guest on the web: group and add expense | Web: group as a guest, Web: add expense as a guest |

Not in MVP and not drawn: S-FRD-01..03 (Friends moved to a fast follow), S-EXP-SCAN, S-SRCH-01, S-TOT-01, S-CHT-01.

Open gaps: Arabic is deferred (the MVP focus is English); the handbook PDF has not been cross-checked; real Arabic and English copy from the text catalogue (the mockup wording is a draft).
