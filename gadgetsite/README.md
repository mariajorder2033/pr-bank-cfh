# gadgetsite

Admin-controlled electronics store for Bangladesh: storefront, `/admin` panel and API in one
Next.js 15 app, on PostgreSQL 16 and Redis. Prices are whole taka (`৳1,85,990`); every
shopper-facing string has English and Bangla.

- Design spec: [`docs/superpowers/specs/2026-10-09-gadgetsite-design.md`](docs/superpowers/specs/2026-10-09-gadgetsite-design.md)
- Product and technical requirements: [`docs/reference/PRD.md`](docs/reference/PRD.md), [`docs/reference/TRD.md`](docs/reference/TRD.md)
- Payment and courier status: [`docs/integrations-status.md`](docs/integrations-status.md)

This is a standalone npm project. It is not part of the bank monorepo's workspaces; run every
command from this folder.

## Setup

Requires Node.js 22.13+, PostgreSQL 16 and Redis 7.

```sh
cp .env.example .env
docker compose up -d      # or use a local PostgreSQL/Redis matching .env
npm install               # also generates the Prisma client
npm run db:migrate        # apply migrations
npm run seed              # sample catalog, staff roles, default settings
npm run dev               # http://localhost:3000
```

The seed adds sample products only. It never adds EMI rates, orders, customers or provider
credentials; staff enter those in admin. It is safe to re-run and never overwrites admin edits.

## Scripts

| Script                     | What it does                                            |
| -------------------------- | ------------------------------------------------------- |
| `npm run dev` / `build`    | Next.js dev server / production build                   |
| `npm run typecheck`        | `tsc --noEmit`                                          |
| `npm run lint`             | ESLint and Prettier check (`npm run format` to fix)     |
| `npm test`                 | Unit tests (pure domain logic)                          |
| `npm run test:integration` | Tests against a real PostgreSQL (`TEST_DATABASE_URL`)   |
| `npm run db:dev`           | Create a migration after editing `prisma/schema.prisma` |
| `npm run db:migrate`       | Apply migrations                                        |
| `npm run seed`             | Seed sample catalog and defaults                        |

The integration suite drops and recreates the database named in `TEST_DATABASE_URL`; the e2e suite
does the same for `E2E_DATABASE_URL`, seeds it, builds the app and serves it on port 3100. Both
refuse to touch a database whose name does not end in `_test` or `_e2e`. Without a downloaded
Playwright browser, set `PLAYWRIGHT_CHROMIUM_PATH` to a local Chromium binary.

## Customer accounts

Customers can browse and fill a cart without an account (the cart lives in their browser).
`/account/signup` creates an account with name, mobile number and password; `/account/login`
logs in with mobile number and password, or with a 6-digit SMS code when an SMS gateway is set.
Signing in by SMS creates the account for a new number. The first SMS sign-in on an account whose
number was never verified wipes its password and signs out its sessions, so nobody can keep a
number they registered without owning it. Each login records its time and IP on the customer.

| Variable           | Purpose                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SESSION_SECRET`   | 32+ random characters; signs SMS codes. Required.                                                                                                                  |
| `REDIS_URL`        | Rate limits for login, signup and SMS codes. If Redis is down, login is refused.                                                                                   |
| `SMS_PROVIDER`     | Unset: SMS login hidden. `console`: prints codes to the log (dev/test only, **never production**). A real Bangladeshi gateway adapter is added once one is chosen. |
| `SMS_CONSOLE_FILE` | With `console`, also appends `{phone, text}` lines here (used by e2e).                                                                                             |

## Storefront routes

`/` · `/category/[slug]` (filters in the URL: `brands`, `min`, `max`, `inStock=1`, `sort`, `page`) ·
`/products/[slug]` · `/brands` · `/search?q=` or `?brand=` · `/online-exclusive` · `/pre-order` ·
`/emi-policy` · `/about` · `/blogs` · `/blogs/[slug]` · `/[slug]` (admin CMS pages) · `/wishlist` ·
`/compare` · `/account` · `/account/login` · `/account/signup`. JSON: `GET /api/products?slugs=`, `GET /api/search?q=`, `POST /api/preorder-requests`.

All content (menus, ribbon, banners, home rows, pages, settings, theme, motion) is read from the
database through Next's data cache (`lib/server/cached.ts`, 5-minute revalidate, tags `catalog`,
`content`, `settings`). Admin saves revalidate those tags. **A database change made outside the
admin** (a restore, a SQL fix, a reseed) needs `rm -rf .next/cache/fetch-cache` or a restart
with a clean cache, or shoppers may see the old data for up to five minutes. Policy pages and the footer links to them appear once admin gives them a body.

## Layout

| Path              | Contents                                                                      |
| ----------------- | ----------------------------------------------------------------------------- |
| `app/`            | Next.js routes (storefront, `/admin`, `/api`) — from Stage 2                  |
| `lib/domain/`     | Pure logic: money, discount, EMI, stock status, order/payment/shipment states |
| `lib/db.ts`       | Prisma client                                                                 |
| `prisma/`         | Schema, migrations, seed                                                      |
| `tests/`          | `unit/` and `integration/`                                                    |
| `docs/reference/` | Original PRD, TRD and HTML prototypes                                         |

## Roadmap (spec §12)

1. **Foundation** — scaffold, schema, domain logic, seed, CI _(done)_
2. **Catalog read path and storefront port** _(done)_
3. Admin core: auth, 2FA, roles, audit log, settings, catalog
4. Admin content: home builder, banners, menus, pages, promotions, EMI tables
5. Checkout: cart, stock holds, OTP, addresses, orders, COD and bank transfer
6. Payments: bKash, SSLCommerz, aamarPay, webhooks, reconciliation, refunds
7. Shipping: Pathao, Steadfast, RedX, courier rules and fallback, COD ledger
8. Accounts, notifications, Playwright matrix, hardening and deploy
