# ADR 0002: Append-only ledger and exact money arithmetic

- **Status:** Proposed, pending Phase 0 architecture and compliance sign-off
- **Date:** 2026-09-30

## Context

The first draft of the PRD let admins edit posted transactions in place (amount, date, type) and edit balances directly. Changing posted entries in place breaks the audit trail, makes statements already issued disagree with the ledger, and would not pass an audit or a FINMA review. PRD FR-27a, FR-76 and FR-78 were revised to the model below.

## Decision

- Posted transactions are append-only. Their financial fields never change and they are never deleted.
- A mistake is corrected with a linked reversal (TXN-33) that exactly offsets the original, plus, where needed, a linked replacement entry under the correct transaction type. Both reference the original via `correctsTransactionId`.
- Admin corrections and standalone manual adjustments (TXN-32) require an approved maker-checker request: a justification note, and a checker who is not the maker.
- Balances are derived from posted entries, never stored as editable fields. The available balance also subtracts debits still in flight.
- Status is lifecycle state and moves only along defined transitions. The budgeting category is the only other field editable after posting.
- Money is an integer number of minor units (`bigint`). APIs carry amounts as decimal strings, never floating-point numbers.

`packages/domain` implements these rules in memory, and its tests pin them down. The persistent ledger must enforce the same rules in storage: no UPDATE of financial columns, no DELETE, and linked-entry constraints.

## Consequences

- Every balance can be rebuilt from its full history, and statements already issued stay consistent.
- Customers see corrections as extra entries, which is how bank statements normally show reversals ("Storno" entries).
- The admin portal needs a "correct" flow (ui-ux-design.md §4.8) rather than a free-form edit form.
