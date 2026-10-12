# gadgetsite: notes for Claude Code

Standalone Next.js 15 app (not part of any parent monorepo). Run every command from this folder.
Current state and remaining work: `docs/PROGRESS.md`. Design: `docs/superpowers/specs/`. Stage
plans: `docs/superpowers/plans/`. Source requirements: `docs/reference/` (PRD, TRD, prototypes).

## Run

```sh
cp .env.example .env   # set SESSION_SECRET and CREDENTIALS_KEY (openssl rand -hex 32)
docker compose up -d && npm install && npm run db:migrate && npm run seed
npm run admin:create -- --email you@example.com --role owner
npm run dev
```

After editing `prisma/schema.prisma`: `npm run db:dev -- --name <change>` then `npx prisma generate`
(Prisma 7 does not regenerate the client on migrate).

## Checks before every commit

`npm run lint && npm run typecheck && npm test && npm run test:integration`; for UI changes also
`npm run test:e2e`. Integration and e2e drop and recreate their own databases (`*_test`, `*_e2e`).

## Conventions

- Money is whole taka (integers); format with `formatBDT`. Discount, EMI and stock status are
  computed (`lib/domain/`), never stored.
- Every shopper-facing string is `{ en, bn }`; Bangla falls back to English when blank.
- Nothing hard-coded: content, menus, settings, theme and motion come from the database via
  `lib/server/cached.ts` (tags `catalog`, `content`, `settings`).
- Admin writes go through `adminAction(permission, zodSchema, tags, handler)` in
  `lib/admin/action.ts`: permission check, Zod validation, audited in the same transaction,
  then `revalidateTag`. Rich HTML goes through `lib/admin/sanitize.ts`.
- Service keys (SMS, later payments and couriers) are stored encrypted with
  `lib/server/credentials.ts`; never return them to the browser.
- Mobile first; breakpoints ≤700, 701–1100, ≥1101 px. Respect `prefers-reduced-motion`.
- TDD: write the failing test first, for domain logic and server actions alike.

## Next task

Stage 3 Task 9 (`docs/superpowers/plans/2026-10-10-stage-3-admin-core.md`): `tests/e2e/admin.spec.ts`,
then the Stage 3 review, then Stage 4.
