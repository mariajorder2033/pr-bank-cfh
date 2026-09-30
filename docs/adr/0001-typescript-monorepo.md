# ADR 0001: TypeScript monorepo for services, shared packages and web

- **Status:** Proposed, pending Phase 0 architecture sign-off (development-process.md §3)
- **Date:** 2026-09-30

## Context

TRD §2 leaves the backend language open (Java/Spring Boot or Node.js/NestJS) and the web app open (React or Angular). The design system must be shared across web and mobile as a single token source (ui-ux-design.md §8), and APIs are designed contract-first (development-process.md §3).

## Decision

- One repository with npm workspaces: `packages/*` for shared libraries and contracts, `services/*` for backend services. Web and admin apps go in `apps/*` when they start.
- TypeScript on Node.js 22 throughout, so the domain model (money, IBAN, transaction types, ledger rules) is written once and shared by services and clients.
- Fastify for services. It is lightweight, validates requests with JSON Schema natively, and fits the OpenAPI 3.1 contracts. NestJS remains an option if the team wants its module/DI structure; the domain package does not depend on either.
- Vitest for tests, ESLint and Prettier for style, `tsc -b` project references for builds.
- OpenAPI 3.1 specs in `packages/api-contracts`, linted with Redocly and enforced by contract tests in each service.
- GitHub Actions for CI because the repository is on GitHub. TRD §2 lists GitLab CI/Jenkins; this can move if the bank standardises elsewhere.

## Consequences

- One toolchain and one language for the team to learn, and shared code without publishing packages.
- Mobile apps (Kotlin/Swift or React Native, TRD §2) are not decided here. React Native would reuse the TypeScript packages directly; native apps would consume `tokens.json` and the OpenAPI specs.
- If the bank mandates Java for core services, the contracts and design tokens stay valid; only the service implementations change.
