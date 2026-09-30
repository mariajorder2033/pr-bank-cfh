# Migros-Private Banking — Full Development Process Document

**Companion to:** `ebanking-prd-trd.md`, `ui-ux-design.md`
**Version:** 1.0 (Draft)
**Date:** October 1, 2026

---

## 1. Methodology
**Agile/Scrum**, 2-week sprints, with a dedicated **Discovery/Design track** running 1 sprint ahead of the build track (dual-track agile) so design is always validated before development starts on it.

## 2. Team Structure & Roles
| Role | Responsibility |
|---|---|
| Product Owner | Owns backlog priority, represents business/compliance stakeholders |
| Delivery/Scrum Lead | Runs ceremonies, removes blockers, tracks velocity |
| UX/UI Designers | Own the design system and screen designs (per `ui-ux-design.md`) |
| Frontend Engineers (Mobile: iOS/Android or cross-platform; Web) | Build client apps |
| Backend Engineers | Build microservices, APIs, integrations |
| DevOps/Platform Engineers | CI/CD, infrastructure, observability |
| QA Engineers | Test planning, automation, manual exploratory testing |
| Security Engineer | Threat modeling, secure code review, pen-test coordination |
| Compliance/Legal Liaison | Reviews KYC/AML, FINMA, data-privacy, and cross-border requirements before features ship |
| Core Banking Integration Specialist | Owns the CBS/middleware integration layer |

## 3. Development Phases

### Phase 0 — Discovery & Foundations (Weeks 1–8)
- Finalize PRD/TRD sign-off with stakeholders (this document set).
- Compliance review: FINMA licensing conditions, KYC/AML approach (including the flagged Encrypted Banking and crypto-deposit items), esisuisse disclosure requirements.
- Architecture decision records (ADRs) for: cloud vs. on-prem hosting, CBS integration pattern, identity provider choice.
- Design system foundations (`ui-ux-design.md` §2) locked before high-fidelity screens begin.
- Vendor selection: KYC/liveness vendor, sanctions-screening vendor, SWIFT/SEPA connectivity partner, card-issuing processor.
- Security: initial threat model for the whole platform.

### Phase 1 — MVP Build (Weeks 9–30)
Core scope: Sign-up/login (PRD §6.1, incl. passkeys FR-54 and session management FR-55), Account Management, Domestic Payments & Transfers (incl. bill pay and scheduled payments), Card Services, Notifications, Support (incl. chat), light/dark theming (FR-62). Matches the PRD §10 Release Roadmap.
- Sprint 0 of this phase: environment setup (dev/staging/prod), CI/CD pipeline, base microservice scaffolding, API gateway configuration.
- Feature build proceeds service-by-service per TRD §3, with contract-first API design (OpenAPI specs agreed before backend/frontend work starts in parallel).
- Weekly design-QA sync to catch UX drift from the design system early.
- End of phase: internal alpha release (staff-only), closed to real customer data.

### Phase 2 — Extended Features (Weeks 31–46)
International Transfers, Encrypted Banking, Crypto/Binance Funding, Admin Portal full-control features, and the remaining extended features (PRD §6.11 categories A–L, incl. SME bulk payments and Wealth/Private Banking extended features I–L).
- Encrypted Banking and Crypto Funding features are gated behind a **compliance sign-off checkpoint** before entering this phase's sprint backlog, per the flags raised in the PRD (FR-13n3, FR-13x).
- Admin Portal built in parallel by a semi-dedicated sub-team, given its distinct desktop-first design system.
- Beta release to a limited external customer cohort at the end of this phase.

### Phase 3 — Hardening, Compliance Sign-off & Launch Prep (Weeks 47–56)
- Full security penetration test (external vendor) and remediation.
- Load/performance testing against NFR targets (TRD §9).
- FINMA/regulatory pre-launch review and sign-off.
- Full accessibility audit (WCAG 2.1 AA) against `ui-ux-design.md` §6.
- Disaster-recovery drill (simulate failover, validate RTO/RPO targets).
- Staff training for Admin Portal / support teams.

### Phase 4 — Launch & Stabilization (Weeks 57–60+)
- Phased/staged rollout (percentage-based feature flag rollout to production traffic).
- Hypercare period: elevated on-call coverage, daily bug-triage standup.
- Post-launch retrospective and backlog grooming for Phase 5 (Open Banking, AI features — currently out of scope per PRD §5.2 and §10).

## 4. Environment Strategy
| Environment | Purpose | Data |
|---|---|---|
| Local/Dev | Individual developer work | Synthetic/mocked |
| Integration/QA | Automated test suite execution, service integration testing | Synthetic, refreshed nightly |
| Staging | Pre-prod, mirrors production config | Masked/anonymized production-like data |
| Production | Live customer environment | Real, fully encrypted/access-controlled |

Promotion between environments is automated via the CI/CD pipeline (GitOps); no manual production deployments.

## 5. Source Control & Branching
- Trunk-based development with short-lived feature branches (merged via pull request, minimum one peer review + automated checks passing).
- Protected `main`/`release` branches; direct pushes disabled.
- Conventional commit messages to drive automated changelog generation.

## 6. CI/CD Pipeline
1. **Commit stage:** lint, unit tests, SAST (static application security testing) scan.
2. **Build stage:** container image build, dependency vulnerability scan (SCA).
3. **Test stage:** integration tests, contract tests (Pact) between services.
4. **Staging deploy:** automatic on merge to `release` branch; smoke tests run.
5. **DAST scan:** dynamic security scan against staging.
6. **Production deploy:** manual approval gate (release manager), then automated blue-green or canary deployment.
7. **Post-deploy:** automated health checks; automatic rollback on failed health check or elevated error rate.

## 7. Testing Strategy (expanded from TRD §11)
| Test Type | Owner | When |
|---|---|---|
| Unit tests (≥80% coverage target) | Engineers | Every commit |
| Contract tests | Engineers | Every commit affecting an API |
| Integration tests | QA + Engineers | Every merge to release branch |
| End-to-end tests (critical flows: login, transfer, card freeze, international transfer, admin transaction correction with maker-checker approval) | QA (automated) | Nightly + pre-release |
| Manual exploratory testing | QA | Each sprint, focused on new features |
| Accessibility testing | QA + Design | Each release affecting UI |
| Security testing (SAST/DAST) | Security Engineer | Every pipeline run |
| Penetration testing | External vendor | Pre-launch, then annually |
| Performance/load testing | DevOps + QA | Pre-launch, then before major releases |
| UAT | Product Owner + representative customers/ops staff | Before each major release |
| Compliance review testing (KYC flow, sanctions screening, audit-log completeness) | Compliance Liaison | Pre-launch and per relevant feature change |

## 8. Definition of Done (per feature)
A feature is "done" only when:
- Code merged with passing CI (unit, contract, integration, security scans).
- UI matches the design system (`ui-ux-design.md`) and passes accessibility checks.
- Feature flag configured (for controlled rollout where applicable).
- Documentation updated (API docs, admin runbook if operationally relevant).
- QA sign-off (manual + automated).
- For regulated features (KYC, transfers, Encrypted Banking, crypto deposits): Compliance Liaison sign-off recorded.

## 9. Release Management
- Versioned releases (semantic versioning for APIs; date-based build numbers for apps).
- Release notes generated from conventional commits, reviewed by Product Owner before publishing.
- Mobile app releases follow platform review timelines (App Store/Play Store); a rollback plan (server-side feature flag disable) is required for any release that can't be pulled instantly from app stores.

## 10. Monitoring, Support & Maintenance (Post-Launch)
- Real-time dashboards (per TRD §9 Observability) monitored by an on-call rotation.
- Incident severity levels (SEV1–SEV4) with defined response-time SLAs and a documented incident-response/postmortem process.
- Monthly security patching cadence; critical vulnerabilities patched within 48 hours of disclosure.
- Quarterly access review (admin roles/permissions audited per RBAC policy, PRD §6.10).
- Ongoing regulatory reporting cadence (FATCA/CRS extracts, AML suspicious-activity reviews) owned by Compliance.

## 11. Risk & Change Management
- Any change to a regulated flow (KYC, transfers, Encrypted Banking, crypto deposits, admin edit permissions) requires a documented change-impact review before merging, not just standard code review.
- A living risk register (extending TRD §12) is maintained and reviewed each sprint by the Product Owner and Compliance Liaison.

## 12. Documentation & Handover
- This document set (`ebanking-prd-trd.md`, `ui-ux-design.md`, `development-process.md`) is treated as living documentation, version-controlled alongside the codebase.
- Each service maintains its own README (setup, API reference, runbook) linked from a central internal developer portal.
- Admin Portal includes in-app contextual help reflecting the latest permitted actions per role.
