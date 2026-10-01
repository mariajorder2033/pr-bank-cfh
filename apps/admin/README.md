# Admin / Back-Office Portal

The internal back-office portal (PRD §6.10), desktop-first and table-dense (ui-ux-design.md §4.8). React + Vite on `@pr-bank/design-tokens` and `@pr-bank/domain`.

## What it covers

- **Overview** — operational metrics (FR-38).
- **Customers** — search and detail with accounts and full transaction history (FR-22, FR-25).
- **Corrections (FR-27a)** — a posted transaction is never edited in place. The correction drawer submits a maker-checker request that, once approved, books a linked reversal plus an optional replacement (ADR 0002).
- **Approvals** — the maker-checker queue (FR-77, FR-78). The maker and checker must be different people; the UI and backend both enforce it.
- **Audit log** — the append-only trail of admin actions (FR-37), read-only by design.

## RBAC roles (demo)

| Role     | Can do                                        |
| -------- | --------------------------------------------- |
| Auditor  | Read-only: records and the audit log          |
| Ops      | Maker: request corrections and adjustments    |
| Approver | Checker: approve or reject others' requests   |
| Super    | Maker and checker (never on the same request) |

## Demo mode

Runs an in-browser backend (`src/api/mock.ts`) over the real domain ledger and maker-checker. Sign-in is a role picker; data is seeded (including one pending correction) and resets on reload. Replace with the Admin Service HTTP client once the internal auth realm (TRD §3.8) is in place.

## Scripts

```sh
npm run dev --workspace @pr-bank/admin
npm run build --workspace @pr-bank/admin
npm run preview --workspace @pr-bank/admin
```
