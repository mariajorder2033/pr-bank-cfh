# Migros-Private Banking — E-Banking Platform

Internet and mobile banking platform for retail, SME, and private-banking customers. CHF is the base currency.

The project is in Phase 0/1 (see `docs/development-process.md` §3). The specification set is the source of truth for scope, design, and delivery, kept under version control as living documentation (§12).

## Documentation

| Document                                                     | Contents                                                                                                                                                       |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/ebanking-prd-trd.md`](docs/ebanking-prd-trd.md)       | Product requirements (FR-1 to FR-93, transaction types TXN-01 to TXN-34, NFRs) and technical requirements (architecture, services, data model, APIs, security) |
| [`docs/ui-ux-design.md`](docs/ui-ux-design.md)               | Design system, information architecture, key screens, user flows, accessibility (WCAG 2.1 AA)                                                                  |
| [`docs/development-process.md`](docs/development-process.md) | Team, delivery phases, environments, CI/CD, testing strategy, Definition of Done, release and support                                                          |
| [`docs/adr/`](docs/adr)                                      | Architecture decision records                                                                                                                                  |

## Open compliance items

Two feature areas are gated behind Legal/Compliance sign-off before build starts:

- **Encrypted Banking** with face-only verification: PRD FR-13n3, TRD §3.6
- **Crypto/Binance deposit funding** (VASP / Travel Rule scope): PRD FR-13x, TRD §3.7

## Repository layout

| Path                                                   | What it is                                                                                                                  |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| [`apps/web`](apps/web)                                 | Customer web app (ui-ux-design.md §4): login, dashboard, account history, transfers, cards, settings. Runnable in demo mode |
| [`packages/domain`](packages/domain)                   | Shared domain model: money in minor units, IBAN (ISO 13616), transaction types, append-only ledger, maker-checker approvals |
| [`packages/design-tokens`](packages/design-tokens)     | Design tokens from `ui-ux-design.md` §2, generated as CSS custom properties and JSON, with WCAG contrast tests              |
| [`packages/api-contracts`](packages/api-contracts)     | OpenAPI 3.1 contract for the customer API (accounts, transactions, transfers, cards)                                        |
| [`services/account-service`](services/account-service) | Account Service (TRD §3.2): balances and transaction history                                                                |

The stack is TypeScript on Node.js 22 in an npm-workspaces monorepo ([ADR 0001](docs/adr/0001-typescript-monorepo.md)). The ledger rules are in [ADR 0002](docs/adr/0002-append-only-ledger.md).

## Development

Requires Node.js 22.13 or later.

```sh
npm install
npm test                # unit and contract tests
npm run typecheck
npm run lint            # ESLint and Prettier
npm run lint:contracts  # Redocly lint of the OpenAPI spec
npm run build           # compiles all packages and generates design-token CSS/JSON
```

CI runs the same checks, plus a dependency vulnerability scan, on every pull request.

## Contributing

Trunk-based development with short-lived feature branches, pull-request review, and Conventional Commits. See `docs/development-process.md` §5.
