# gadgetsite — Design spec

Date: 2026-10-09 · Status: draft for review
Sources: `docs/reference/PRD.md` (v1.1), `docs/reference/TRD.md` (v1.1), `docs/reference/prototypes/*.html`, and the partial storefront from the original `gadgetsite-all.zip`.

## 1. Intent

**What the owner said:** build the whole gadgetsite package for real. Only the product catalog may be sample data. There are no merchant accounts yet, so build and test against the providers' public sandboxes, and going live must need only keys, with no code changes.

**Outcome:** a working electronics store for Bangladesh. The storefront, admin panel, API, database and background worker all run against PostgreSQL and Redis. Staff run every piece of content, price and setting from the admin panel. Payments and couriers go through real provider adapters.

**Success criteria**

1. `docker compose up` (or `npm run dev` plus local Postgres and Redis) gives a working store seeded with sample products.
2. Every PRD §18 acceptance criterion passes against provider sandboxes once those hosts are reachable. Until then, the adapters are covered by contract tests built from the providers' documented request/response shapes, and they are clearly labelled "sandbox-unverified".
3. The TRD §11 Playwright matrix passes at 375, 768, 1024, 1440 and 1536 px, with zero console errors.
4. No hard-coded content: text, banners, menus, prices, EMI rates, delivery fees and policies all come from the database and can be edited in the admin panel.
5. Switching a provider from sandbox to live is an admin toggle plus credentials.

**Assumptions**

- Sample data is limited to products, categories, brands, banners and pages created by `npm run seed`. Admin can replace all of it.
- Real orders, customers, payments and shipments are never seeded.

## 2. Constraints

- The project lives in `gadgetsite/` inside the `pr-bank-cfh` repo as a **standalone npm project**. It is not part of the root workspaces, and the root ESLint, Prettier and Vitest configs ignore it. It has its own CI workflow, `.github/workflows/gadgetsite.yml`, scoped to `gadgetsite/**`.
- The zip's golden rules apply (reference `CLAUDE.md`):
  - BDT as whole-taka integers, shown with Bangladeshi grouping (`৳1,85,990`).
  - bn/en for every user-facing string.
  - Discount, EMI and stock status are computed, never entered by hand.
  - Every admin write writes an audit row and triggers revalidation.
  - Zod on all input; rich text is sanitised.
  - Mobile-first; motion constants live in one module.
  - Never trust the browser for money or status.
- Network: the provider sandbox hosts are currently blocked by the session's network policy. Adapters are written from the official docs. The live-sandbox test suite (`npm run test:sandbox`) is skipped unless `SANDBOX_TESTS=1`.

## 3. Architecture (approach A: one Next.js app plus a worker)

```
Browser ─▶ Next.js 15 app (storefront · /admin · /api)  ─▶ PostgreSQL 16 (Prisma)
                     │                                    └▶ Redis (cache, rate limit, BullMQ)
                     └── enqueue ──▶ worker (BullMQ): webhooks, reconciliation, reservation expiry,
                                       courier polling, notifications
Provider webhooks ─▶ /api/webhooks/* (verify → save raw → enqueue → 200)
```

- **Stack:**
  - Next.js 15 App Router, React 19, strict TypeScript, Tailwind 3, next-intl.
  - Prisma 6 on PostgreSQL 16 (search: `tsvector` + `pg_trgm`, replacing Meilisearch).
  - Redis via ioredis, with BullMQ for jobs.
  - Zod, sanitize-html, argon2 for password hashing, otplib for admin TOTP.
  - Vitest and Playwright for tests.
- **Deviation from TRD:**
  - There is no separate NestJS service. The API lives in Next.js route handlers, and the domain and integration code sits in `lib/` with no Next.js imports, so it can be moved into its own service later.
  - Meilisearch is replaced by Postgres search (YAGNI for a single store's catalog).

### 3.1 Folder layout

```
gadgetsite/
  app/(store)/...           storefront routes (ported from the zip storefront)
  app/admin/...             admin panel (route group, own layout, auth-guarded)
  app/api/...               REST: catalog, cart, checkout, orders, payments, shipping, admin/*
  app/api/webhooks/...      payments/[provider], couriers/[courier]
  lib/domain/               pure logic, no I/O: money, emi, pricing, stock, state machines
  lib/server/               services that use the db: catalog, checkout, orders, payments, shipping, audit, settings
  lib/integrations/         payments/{bkash,sslcommerz,aamarpay}, couriers/{pathao,steadfast,redx}, sms/*, storage/*
  lib/db.ts, lib/redis.ts, lib/crypto.ts (AES-256-GCM for stored credentials)
  prisma/schema.prisma, prisma/migrations, prisma/seed.ts
  worker/index.ts           BullMQ processors and repeatable jobs
  messages/{en,bn}.json     UI chrome strings (content strings live in the DB per language)
  tests/unit, tests/integration (real Postgres/Redis), tests/e2e (Playwright), tests/sandbox
  docker-compose.yml, Dockerfile, .env.example
```

## 4. Data model

All tables from TRD §3 and §12.4, in Prisma. Notes:

- **Translatable content.** Every column a shopper can read has `_en` and `_bn` variants (for example `title_en`, `title_bn`), or uses JSON `{en, bn}` for builder sections. The locale falls back to `en` when `bn` is empty.
- **Money.** `Int` (whole taka) everywhere. Adapters convert at the edge if a provider needs a decimal string.
- **Never stored:** discount %, EMI monthly amount and stock status. They are computed in `lib/domain` and returned by the API.
- **Stock.** `variants.stock` holds the on-hand count. `stock_reservations(variant_id, qty, order_id, expires_at, status)` holds stock during checkout. Available = stock − active reservations, computed in SQL inside a transaction with `SELECT … FOR UPDATE` on the variant row.
- **Settings.** `settings(key, json)` holds site name, logo, theme tokens, motion constants, delivery fees, the free-delivery threshold, COD rules and the payment-fee payer.
- **Audit.** `audit_logs(actor_id, action, entity, entity_id, before, after, ip, at)`. One row per admin write, written in the same transaction as the write.
- **Order history.** `order_events(order_id, from, to, actor, reason, at)` for every transition.

## 5. Domain logic (`lib/domain`)

- `money.ts`: `formatBDT(n, locale)` with Bangladeshi grouping and Bangla digits when locale is `bn`.
- `pricing.ts`:
  - `discountPercent(regular, offer)`, rounded down.
  - Cart totals: items, add-ons, care plans, coupon, delivery, payment fee and EMI interest.
- `emi.ts`:
  - `monthly = ceil(price × (1 + rate%) / tenure)`.
  - Rates are passed in, never defaulted.
  - The minimum amount comes from the bank row.
- `stock.ts`: `stockStatus(available, lowThreshold)` → in_stock / few_left / out_of_stock / preorder.
- `state/order.ts`, `state/payment.ts`, `state/shipment.ts`:
  - Transition tables exactly as TRD §12.1.
  - `transition(current, next)` throws `IllegalTransition`.
  - Customer-visible labels follow PRD §14.4.

Everything here is pure and unit-tested.

## 6. Key flows

### 6.1 Catalog and content (read path)

- Storefront pages are React Server Components that call `lib/server/catalog` directly; there is no HTTP hop in the same process.
- Public `/api/*` mirrors those calls for client components (search, cart).
- Pages use ISR, tagged by entity.
- Admin saves call `revalidateTag` for the affected tags, plus a Redis cache delete.

### 6.2 Checkout (TRD §12.2)

1. **`POST /api/checkout/session`.**
   - Validate the cart against the database (price, stock, active status) and return differences ("price changed" / "out of stock" states).
   - Create the reservation rows (15 min) and the session in Redis.
2. **Contact.** Phone OTP (`otp_codes`: hashed code, 5-minute expiry, 5 attempts, rate-limited per phone and IP).
3. **Address.** The area list is cached from the courier `areas()` calls into the `courier_areas` table. Serviceability = at least one `courier_rules` match, otherwise suggest store pickup.
4. **Delivery quote.** From the rule's base rate, or a live `quote()` when the courier supports it.
5. **`POST /api/orders`.**
   - Needs an `Idempotency-Key`. `idempotency_keys(key, request_hash, response)` rejects a reused key that comes with a different body.
   - Totals are recomputed on the server.
   - The order is created in `pending_payment`. COD and bank-transfer orders go straight to `placed`.
6. **`POST /api/payments/:provider/init`.** Creates a `payment_attempts` row, calls `adapter.init`, and returns the redirect URL.
7. **Provider return URL.** Shows a waiting page and enqueues `verify`; it never marks an order paid. A webhook or IPN, plus a reconciliation job every 5 min for attempts pending longer than 3 min, call `verify()`.
8. **`paid`.**
   - Order → `placed`, reservations → converted (stock decremented).
   - Notifications enqueued, invoice generated.
9. **`failed`, `cancelled` or `expired`.**
   - Reservations released, order → `payment_failed`.
   - The retry link reuses the order.
10. **Reservation expiry job** (every minute): releases expired holds and expires the matching attempts.

### 6.3 Webhooks (TRD §12.3)

1. Verify the signature or secret, using each provider's scheme.
2. Insert `webhook_logs` with the raw body and headers.
3. Enqueue the job and return 200.
4. The worker dedupes on `(source, event_id)` with a unique index.

Retries use exponential backoff with jitter, a 10 s timeout and a per-provider circuit breaker (stored in Redis).

### 6.4 Shipping

- **Booking.** Book manually from the order page, or automatically on `ready_to_ship`. The courier is chosen from `courier_rules` by zone, weight, COD amount and priority.
- **Fallback.** If a booking fails, try the next rule and raise an admin alert.
- **Tracking.** Webhooks, plus polling every 15 min for open shipments. Events are mapped to shipment statuses, which drive order statuses.
- **COD ledger.** `delivered` with COD → `cod_collected`. Admin records the remittance → reconciled.

### 6.5 Refunds

`POST /admin/orders/:id/refund` calls `adapter.refund` on the original method.

- The SLA due date is set from settings.
- A job alerts on refunds still open past their due date.
- COD and bank-transfer refunds are manual, with a record.

## 7. Integrations

| Kind     | Adapters in v1                                                                                                                                        | Notes                                                                                                                   |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Payments | bKash (tokenized checkout), SSLCommerz (cards, net banking, EMI, MFS), aamarPay (Nagad, Rocket, Upay), COD, bank transfer (slip upload), pay at store | Interface from TRD §12; ShurjoPay and direct Nagad come later                                                           |
| Couriers | Pathao, Steadfast, RedX, own riders (manual), store pickup                                                                                            | Paperfly and eCourier come later                                                                                        |
| SMS      | `SmsProvider` interface; first concrete adapter picked when the owner chooses a BD gateway                                                            | In `NODE_ENV=development` a console adapter prints OTPs. Production refuses to start without a configured SMS provider. |
| Email    | SMTP via nodemailer (works with SES)                                                                                                                  | Optional; skipped if unset                                                                                              |
| Storage  | `StorageDriver`: local disk (dev) and S3-compatible (prod)                                                                                            | Admin uploads; images served through Next/Image                                                                         |

- **Credentials.**
  - Stored in `payment_providers.config_encrypted` and `couriers.config_encrypted` with AES-256-GCM. The key comes from the `CREDENTIALS_KEY` env var.
  - In admin they are write-only: the API returns only `••••` and the last 4 characters.
  - Logs pass through a redactor.
- **Modes.** `mode` is `sandbox | live` per provider, set in admin. There is no global mock mode; tests use HTTP-level fakes (`msw`) instead.
- **Rebuilding the adapters.** Each adapter is re-checked against the provider's current official docs before it is written; the zip versions were written from memory and are not trusted. Each one records the doc URL and version it follows in a header comment. Hosts I can't reach are marked `SANDBOX-UNVERIFIED` in `docs/integrations-status.md`.

## 8. Admin panel

- **Auth.**
  - Email + password (argon2id), TOTP 2FA required for every admin.
  - Session cookie: httpOnly, SameSite=Lax, rotated.
  - Login rate limit.
  - First admin created by `npm run admin:create`.
- **RBAC.** Roles are owner, manager, catalog, content, orders, support and finance. Each permission is checked in each route handler through `requirePermission()`.
- **Screens (PRD §6, §17):**
  - Dashboard
  - Site identity and settings (including theme tokens and motion)
  - Products and variants (bulk price/stock edit, CSV import/export)
  - Categories, brands, filters, badges, care plans and add-ons
  - Home and landing builder (section list with JSON schema per section type, drag order, schedule)
  - Banners, menus and mega menus, Explore All, ticker
  - Pages and blog (TipTap editor, output sanitised)
  - Orders (detail with timeline, payment attempts, courier booking, refund, notes)
  - EMI banks and rates; payment gateways
  - Couriers and courier rules; COD settlement
  - Promotions (coupons, flash sales)
  - Customers and reviews; pre-order requests
  - Notification templates (bn/en)
  - Users and roles; audit log
- **UI.** Tailwind with a small in-repo component set (table, form, dialog, toast). There is no shadcn CLI step; components are written directly. Tables use TanStack Table and drag ordering uses dnd-kit.

## 9. Storefront

- Port the zip storefront into `app/(store)`, replacing `lib/mock.ts` with `lib/server/catalog`.
- Keep the zip's component classes and the motion behaviour (TRD §9, PRD §9): hero slider, ribbon pin, wipe dropdowns, Explore All.
- Fill in the missing states from PRD §14.3: price/stock changed, payment pending/failed/cancelled, not serviceable, OTP errors, tracking timeline.
- Add a guest order lookup (phone + order number).
- Customer account: OTP login, orders, addresses, wishlist (server-side for logged-in users).

## 10. Security

- Zod on every route.
- CSRF:
  - Same-site cookies, plus an `Origin` check on mutating requests.
  - Webhook routes are exempt and are protected by their signatures instead.
- Rate limits in Redis on login, OTP, coupon and payment init.
- Security headers: CSP, HSTS, frame-ancestors none.
- PII is limited to what checkout needs.
- Card data never touches our servers (hosted pages only).
- File uploads are checked by type, size and image re-encode (sharp).

## 11. Testing

- **Unit (Vitest):** everything in `lib/domain`, plus the adapters' request building and response parsing against fixtures taken from the providers' docs.
- **Integration (Vitest, real Postgres and Redis):**
  - Idempotency: a double POST gives one order.
  - Reservation races: N parallel checkouts for the last unit, and exactly one succeeds.
  - Webhook replay and dedupe.
  - Courier fallback.
  - Refund SLA job.
  - Audit row on every admin write.
- **E2E (Playwright):**
  - The TRD §11 responsive and motion matrix.
  - Guest COD checkout end to end.
  - bKash and card flows against an HTTP fake of the gateway (`msw`/stub server), until the sandboxes are reachable.
  - An admin edit shows up on the storefront.
- **Sandbox (`npm run test:sandbox`, opt-in):** real calls to each provider sandbox.
- **CI:** typecheck, lint, unit, integration (services: postgres:16, redis:7) and Playwright.

## 12. Delivery order (becomes the implementation plan)

1. Foundation: project scaffold, root ignores, Prisma schema and migrations, `lib/domain` with tests, seed, CI.
2. Catalog and content read path; port the storefront to the database.
3. Admin core: auth, 2FA, RBAC, audit, settings, catalog CRUD, uploads, revalidation.
4. Admin content: builder, banners, menus, pages, blog, promotions, EMI tables.
5. Checkout: cart, session, reservations, OTP, address/areas, orders with idempotency, COD and bank transfer.
6. Payments: adapter framework, bKash, SSLCommerz, aamarPay, webhooks, reconciliation, refunds.
7. Shipping: courier adapters, rules and fallback, booking, tracking, COD ledger.
8. Customer account, notifications, invoices; Playwright matrix; hardening, Docker, docs.

## 13. Out of scope for v1

Marketplace sellers, native apps (PWA only), B2B quotes, WhatsApp notifications, the trade-in valuation workflow beyond the request form, loyalty points redemption (the ledger is stored, redemption comes later), ShurjoPay, Paperfly, eCourier, and direct Nagad, Rocket and Upay merchant APIs.

## 14. Open items for the owner

- Allow the provider sandbox hosts in the environment's network policy, so the sandbox suite can run.
- Choose an SMS gateway (for example SSL Wireless or BulkSMSBD) before go-live.
- The production hosting target (VPS, ECS or Cloud Run) and the domain.
