# Migros-Private Banking — E-Banking Platform

Internet and mobile banking platform for retail, SME, and private-banking customers. CHF is the base currency.

This repository is at the planning stage. The specification set below is the source of truth for scope, design, and delivery. It is kept under version control as living documentation, as `docs/development-process.md` §12 requires.

## Documentation

| Document | Contents |
|---|---|
| [`docs/ebanking-prd-trd.md`](docs/ebanking-prd-trd.md) | Product Requirements (functional requirements FR-1 to FR-93, transaction type list TXN-01 to TXN-34, NFRs, KPIs) and Technical Requirements (architecture, services, data model, API design, security, compliance) |
| [`docs/ui-ux-design.md`](docs/ui-ux-design.md) | Design system (color tokens, typography, spacing, components), information architecture, key screens, user flows, accessibility (WCAG 2.1 AA) |
| [`docs/development-process.md`](docs/development-process.md) | Methodology, team roles, delivery phases 0–4, environments, branching, CI/CD, testing strategy, Definition of Done, release and support process |

## Open compliance items

Two feature areas are gated behind Legal/Compliance sign-off before build starts:

- **Encrypted Banking** with face-only verification: PRD FR-13n3, TRD §3.6
- **Crypto/Binance deposit funding** (VASP / Travel Rule scope): PRD FR-13x, TRD §3.7

## Contributing

Trunk-based development with short-lived feature branches, PR review, and Conventional Commits. See `docs/development-process.md` §5.
