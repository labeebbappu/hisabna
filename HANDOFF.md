# Hisabna (حسابنا) — MVP Developer Handoff

Date: 27 Nov 2026
Source: "Hisabna — Screen Workflows, Data Flow and Scenarios" v1.0 (92 pages), based on Product Specification rev 18.
Rule: where the handbook and the spec differ, the spec wins. The spec was not available for this review, so nothing here is checked against it.

---

## 1. What we are building

A free, bilingual (Arabic RTL / English LTR) group expense-splitting app for Qatar and the GCC, with Splitwise-level features. The app **records** money. It never holds or moves it. Settling up happens in the bank app or Fawran, and Hisabna shows the payee's alias or IBAN and lets both sides confirm.

Platforms: iOS, Android, and a web app for joining a group from a WhatsApp link with no install and no account.

### Product rules that apply to every screen
1. Free for everyone: no limits, ads, trials, Pro badges or upsells (T49).
2. Arabic and English are equal. The language follows the phone and can be switched at once with no restart.
3. Local defaults: QAR and Asia/Qatar. Never default to USD or UTC.
4. Money is exact: integers in the currency's smallest unit.
5. Nobody is blocked from joining (guest join by link).
6. Every change is logged and visible. Nothing is deleted without a way to restore it.
7. Fast entry: amount, description, save.

---

## 2. MVP scope (handbook chapter 12)

**In:** phone OTP, Google and Apple sign-in, guest/no-account use, link/QR/code join, placeholders, groups, default role Editor, split methods Equal / Exact / Percent / Shares / Adjustment, multiple payers, 3-decimal currencies (KWD/BHD/OMR), cash/Fawran/IBAN payment record with confirm, Activity, push, Arabic + English, offline queue.

**Out (v1):** receipt scan and itemized split, recurring, multi-currency conversion, search, totals, charts, export (CSV/Excel/PDF/JSON), Splitwise import, reminders, WhatsApp reminders, whiteboard, lock mode, Viewer role, cross-group settle, merge and delete account, Hijri dates.

**Exit gate (as written):** T01–T33, T38, T46, T49, T50 pass, and zero balance-mismatch bugs for 4 weeks in a closed beta of about 200 users in Qatar.

> ⚠ The gate includes T22 (Viewer) and T23 (lock mode), which are v1 features. Resolve before planning (see §6).

**Assumption in this plan:** the Friends tab and non-group expenses are part of the MVP. Confirm.

---

## 3. Core design (non-negotiable)

- **Share ledger.** `Entry` has one `EntryShare(paid_minor, owed_minor)` per person. Balances and debts are always computed from these rows and are never stored.
- **Net per person per entry = paid − owed.** The sum of nets in a group and currency is exactly 0.
- **Integer minor units, 64-bit.** QAR 2 decimals, KWD/BHD/OMR 3, JPY 0. Never floating point.
- **Rounding (PF-02).**
  - Equal split: `floor(total ÷ people)`; the leftover units go to the payer if the payer is in the split, otherwise one unit each to the first people in member order. Example: QAR 100.00 ÷ 3 → 33.33 / 33.33 / 33.34 (T09). KWD 1.000 ÷ 3 → 0.333 / 0.333 / 0.334 (T10).
  - Percent and Shares: round each share half-up; the difference goes to the payer, else to the largest share.
  - Reject the entry if Σowed ≠ Σpaid ≠ total.
- **Simplify debts (PF-01).** Greedy match of the largest debtor with the largest creditor (ties by join order), at most n−1 payments per currency, no member's net changes. Groups only. Non-group debts are always pairwise.
- **Soft delete.** Entries are kept 1 year and restored with the same ID. Groups are kept 30 days.
- **Append-only** activity log and system change-log comments.
- **Client-generated entry UUIDs** make retries idempotent (T38).
- **Versioned entries.** Version +1 on each accepted write.
- **Privacy defaults.** Phone and email are hidden from group members by default. Payment details are visible only to members of your groups, when enabled. The invite link shows only the group name and first names before joining.

### Invariants (enforce and test)
1. Per entry: Σpaid = Σowed = total.
2. Per group and currency: Σ(paid − owed) over non-deleted entries = 0.
3. Amount precision matches the currency's minor unit.
4. A member with a non-zero net cannot have `left_at` set.
5. No hard delete before 1 year; the activity log and system comments are never updated or deleted.
6. Simplified debts change no member's net.
7. `Entry.version` increases by exactly 1 per accepted write; stale writes go through the merge rules.

### Roles (MVP: everyone is an Editor by default)
Owner, Editor, Viewer. Only Owners remove members, change roles and delete the group. Server must return 403 for forbidden actions even if the UI hides them (T22, T24).

---

## 4. Screens in MVP scope (IDs for routes, tickets and tests)

| Area | Screens |
|---|---|
| Onboarding | S-ONB-01 Splash/language, S-ONB-02 Sign-in, S-ONB-03 Profile, S-ONB-04 First action |
| Join | S-WEB-JOIN |
| Home / Friends | S-HOME-01, S-FRD-01, S-FRD-02, S-FRD-03 |
| Groups | S-GRP-NEW, S-GRP-ADD, S-GRP-01, S-GRP-INV, S-GRP-SET |
| Expenses | S-EXP-01 Add, S-EXP-SPLIT, S-EXP-EDIT, S-EXP-02 Detail |
| Settle | S-BAL-01, S-SET-01, S-SET-02 |
| Other | S-ACT-01 Activity, S-ACC-01 Account (profile, language, payment details) |

Not in MVP: S-EXP-SCAN, S-SRCH-01, S-TOT-01, S-CHT-01.

Process flows needed for MVP: PF-01 to PF-05, PF-08 to PF-09, PF-14, PF-18 (comments), PF-19 to PF-21, PF-24, PF-28. The rest are v1.

---

## 5. Task backlog (dependency order)

### A. Decisions that block the build
1. Stack: Flutter or React Native for the apps, plus backend and database.
2. OTP provider for Qatar and the GCC (SMS and WhatsApp), with send limits per number and IP.
3. Hosting region (in-GCC) and a data-protection review.
4. Can guests (browser, no account) record payments? The handbook contradicts itself.
5. How placeholder claims are protected (see §6.1).
6. T22 / T23 versus the MVP scope.
7. Who can void a disputed payment, and what happens to debts owed by a deleted account.

### B. Spec fixes before coding
8. Fix the data model (see §6.5).
9. Make amount, `paid_by`, `split_method`, `split_input` and shares one atomic unit in sync merges.
10. Write the conflict rule for same-field edits.

### C. Backend
11. Repo, CI, environments, migrations, and the core tables.
12. Money library (minor units, per-currency decimals).
13. Split engine for all five methods plus multiple payers; unit and property tests for T09–T17.
14. Invariants 1–3 enforced in the DB or service layer.
15. Balance engine and Simplify debts (T28, T29).
16. Auth: phone OTP, Google, Apple, guest device account, 5-attempt 15-minute lockout (T01–T03), placeholder claiming (PF-14, T05–T07).
17. Entry API: idempotent create, versioning, role checks, soft delete and restore (T21, T22, T38).
18. Append-only activity log and change log; merge repeat edits within 60 seconds (T19, T20).

### D. Apps and web
19. i18n and RTL from the start, including 200% font checks (T46).
20. Onboarding and Home.
21. Group screens: create, add members, home, invite link/QR/code, settings.
22. Add expense and split options.
23. Balances, choose a debt, record a payment, payee confirm or dispute (T30–T33).
24. Web join, guest session, guest upgrade (T04, T05).
25. Friends tab and friend detail.
26. Activity feed and push notifications: 60-second batching, more than 5 events in 10 minutes becomes one summary, quiet hours 23:00–07:00, never notify the actor (T50).
27. Offline queue and sync with conflict handling (T38, T39).
28. Group lifecycle: leave, remove, archive, delete and restore (T25–T27).

### E. Hardening and release
29. Rate limits and abuse controls for join, code guessing, OTP sends and claims.
30. Verify no ads, Pro badges or paywalls (T49).
31. Run the full gate in Arabic and English, then the 4-week beta with an invariant monitor.
32. Backups, monitoring, crash reporting, privacy policy and terms (Qatar Law 13 of 2016), store listings.

---

## 6. Known problems to fix before or during build

### 6.1 Placeholder claiming is unauthenticated (security)
On S-WEB-JOIN anyone with the link or code can pick any unclaimed placeholder name and then see that member's balances and history and add expenses as them. If the wrong person claims "Sara", it is unclear whether the real Sara can claim it later (PF-14 blocks placeholders "linked to a real account", but a browser identity is not one).
**Fix:** Owner approval or phone verification for claims, plus an Owner action to release an identity.

### 6.2 Join code and OTP abuse
- Only limit stated: 10 join attempts per minute per IP. A 6-character code is at most about 2.2 billion combinations (36⁶), so distributed guessing is not covered. Add per-code and global throttling.
- No limit on how often "Send code" or "Send via WhatsApp" can be requested. SMS pumping can drive up costs, and the funding model is undecided.

### 6.3 Field-level merge can break invariant 1 (SD-4 / PF-09)
Device A edits the amount offline and device B edits the split or shares. The handbook says "merge both, no notice", which can leave Σowed ≠ total. Treat amount, `paid_by`, `split_method`, `split_input` and shares as one unit and revalidate after every merge.

### 6.4 Same-field conflicts are decided by arrival order
A stale offline edit that syncs later overwrites a newer online edit. It is logged and the other author is notified (T39), but consider requiring review for money fields.

### 6.5 Data model gaps (as drawn)
- Non-group entries (`group_id` = null) have `EntryShare.member_id`, but `Member` requires a `group_id`. Add a participant reference that is a user or a placeholder.
- "Pending friend" has no state: `Friendship` has only `user_a`, `user_b`, `created_at`.
- Guest browser identity has no table (session, expiry, revoke).
- Per-user pin, mute and archive flags have no home. `Group.archived_at` is group-wide while Home's long-press Archive reads as per-user.
- Whiteboard is a field on `Group` with no history (v1).

### 6.6 Orphaned debts
PF-12 lets a user delete their account with non-zero balances. PF-03 and invariant 4 block removing a member with a non-zero net. The debt then can never be settled, confirmed or removed. Add a write-off entry or an Owner-recorded settlement on behalf of the member. (Delete account is v1, but the member-removal rule is MVP, so decide now.)

### 6.7 Disputed payments still count (T33)
A payer can zero a debt by recording a payment, and the payee's only recourse is deletion. Define who can void, and any expiry.

### 6.8 Friends tab versus Balances
S-FRD-01 shows raw pairwise nets across ledgers, while S-BAL-01 shows simplified payments when Simplify is on. In the worked example, Sara "owes Ali 46.67" on Friends, but the group tells her to pay Omar 43.34. Needs explicit copy and a rule for how linked payments (T34, v1) interact.

### 6.9 Handbook inconsistencies
- Cover says 27 process flows; there are 28 (PF-01 to PF-28).
- S-WEB-JOIN "what it shows" lists record payment for guests; its workflow and the open decisions say undecided.
- Inline references such as "Section 14", "Section 15" and "7.4" point at the spec's numbering, which collides with the handbook's own chapter numbers.

### 6.10 Privacy and legal
- Deleted accounts remain as "Deleted user (Ali)", so the name is kept. Check against Qatar Law 13 of 2016.
- Entries are retained for at least 1 year; hosting region is undecided.
- (v1) Receipt images go to a third-party OCR/AI service; check retention and region before choosing a provider.

---

## 7. Test plan notes

- The 50 tests (T01–T50) are in handbook chapter 11. QA runs every row in Arabic and English.
- Add tests the handbook lacks:
  - guest claim impersonation and code-guessing throttling
  - OTP send throttling
  - concurrent merge that would break invariant 1
  - property-based tests for all seven invariants (random splits, edits, deletes, restores, simplify)
  - 100-member and attachment limits
  - notification batching beyond T20 and T50
- Run an invariant monitor in production and beta: alert on any group where Σnet ≠ 0.

---

## 8. Reference numbers

| Item | Value |
|---|---|
| OTP | 6 digits, expires in 5 min, 5 wrong attempts then 15-min lock, WhatsApp option after 30 s |
| Join rate limit | 10 per minute per IP |
| Members per group | 100 |
| Description / notes / comment | 80 / 1,000 / 1,000 characters |
| Attachments | 5 per entry, 10 MB each (v1 receipts) |
| Max amount | 9,999,999 major units |
| Push reminders | 1 per debt per 24 h (v1) |
| Notification batching | wait 60 s; more than 5 events in 10 min become one summary |
| Quiet hours | 23:00–07:00 default |
| Entry restore window | 1 year; group restore 30 days |

## 9. Still to be produced (handbook chapter 13)
UI mockups, design system, API specification, technical architecture, Arabic/English text catalogue (Arabic has 6 plural forms), admin/support panel, non-functional requirements (performance, uptime, backups, analytics), legal documents.

## 10. Open decisions from the handbook
Final name and trademark (Hisabna, hisabna.app, hisabna.qa), how the free app is funded (no ads or paywalls allowed), receipt-scan provider (v1), OTP provider, hosting region, tech stack, guest payment recording, Simplify default in Couple groups, allocation for changed linked cross-group payments (v1), whether a leaver can read history (proposal: no).

## 11. Caveats on this review
- Read in full: chapters 1–7 and 9–13. Chapter 8 (screen-by-screen) was only sampled, so verify the per-screen scenarios against the PDF.
- Diagrams were read as extracted text, not viewed as images.
- Worked-example arithmetic in chapter 2 was re-verified and is correct.
