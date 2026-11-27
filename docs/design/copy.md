# Exact copy from the handbook

Strings the handbook fixes. Use them as written. Source: "Screen Workflows, Data Flow and Scenarios" v1.0.

| Where | Copy |
|---|---|
| Sign-in, 5 wrong codes (T02) | Too many attempts. Try again in 15 minutes. |
| Sign-in, code not received after 30 s | Send via WhatsApp (button appears) |
| Invite link or code turned off or reset | This invite link is no longer active. Ask for a new one. |
| Duplicate member name | There is already a member called Ali. Use a different name, e.g. Ali K. |
| Join code matches no group | That code doesn't match any group. Check it and try again. |
| Offline, cached lists and balances | Offline — may change after sync |
| Queued entry | Waiting to sync |
| Split footer | QAR 280.00 of QAR 300.00 — QAR 20.00 left |
| Split blocked, amounts | QAR 20.00 left to assign. |
| Split blocked, percent | 10% left to assign. |
| Split blocked, adjustment | Ali's share would be below zero after the adjustment. |
| Unequal split rescaled after an amount edit (T18) | Shares were rescaled to the new total. Check them before saving. |
| Overpayment (T31) | This is QAR 20.00 more than Sara owes. Record anyway? Ali will then owe Sara QAR 20.00. |
| Payee confirmation request | Sara says she paid you QAR 143.34 by Fawran. Confirm? [Received] [Not received] |
| Linked payments edit (T34) | Apply to all 3 linked payments? |
| Leave group with a balance | You can't leave while you owe or are owed money in this group. Settle up first. |
| Invalid IBAN | This IBAN is not valid. Check it and try again. |
| Home, overall | Overall, you are owed QAR 286.67 / you owe / You are all settled up |
| Balances card | Ali gets back QAR 286.67 in total / Sara owes QAR 143.34 in total |

Wording rule: a payment is always "recorded", never "sent". The app does not move money.

Payment statuses: recorded, confirmed, disputed. See spec overrides in screens.md for "void".
