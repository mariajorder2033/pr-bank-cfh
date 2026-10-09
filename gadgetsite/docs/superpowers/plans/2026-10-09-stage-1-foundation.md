# gadgetsite Stage 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A standalone `gadgetsite/` Next.js project with the full Prisma schema migrated on real PostgreSQL, the pure domain library (money, discount, EMI, stock, state machines) under test, a sample-catalog seed, and CI.

**Architecture:** One Next.js 15 app (spec §3). This stage builds the layers every later stage depends on:

- `lib/domain`: pure functions, no I/O.
- `prisma/`: schema, migrations and seed.
- `lib/db.ts`: Prisma client on `@prisma/adapter-pg`.

The storefront port and the API come in Stage 2.

**Tech Stack:** Node 22, Next.js 15.5, React 19, TypeScript ~5.9 strict, Prisma 7 (`prisma-client` generator + `@prisma/adapter-pg`), PostgreSQL 16, Vitest 5, Zod 4, tsx.

**Spec:** `gadgetsite/docs/superpowers/specs/2026-10-09-gadgetsite-design.md`

## Global Constraints

- All paths are relative to `gadgetsite/`. All commands run from `gadgetsite/`. The bank monorepo root is never modified, except `.github/workflows/gadgetsite.yml`.
- Money is a whole-taka `Int`. Display uses Bangladeshi grouping: `৳1,85,990`.
- Discount %, EMI monthly amount and stock status are never stored columns.
- Every shopper-visible text column has `En` and `Bn` variants (`titleEn`, `titleBn`), or uses JSON `{ en, bn }`.
- Code style is the zip storefront's `.prettierrc`: 2 spaces, no semicolons, single quotes, 100 columns.
- `strict: true` in tsconfig.
- No provider code outside `lib/integrations/*` (none in this stage).
- Only catalog data is seeded (categories, brands, products, variants, badges, banners, menus), plus roles/permissions and default settings. **Never seed EMI rates, orders, customers, payments or provider credentials.**

## Review Focus

1. A non-integer or `NaN` amount passed to `formatBDT`, or to EMI/discount maths, must throw, never print `৳NaN`. Pinned in Tasks 2 and 3.
2. EMI with a fractional rate (e.g. 3.5 %) must not under-charge through float error: the monthly amount rounds **up**. Pinned in Task 3.
3. An offer price at or above the regular price, or a regular price of 0, must give discount 0, never a negative or `Infinity`. Pinned in Task 2.
4. Running the seed twice must not duplicate rows or crash. Pinned in Task 7.
5. Two webhook rows with the same `(source, eventId)`, or a reused idempotency key, must be rejected by the database itself. Pinned in Task 6.

---

### Task 1: Project scaffold

**Files:**

- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `.prettierrc`, `.prettierignore`, `.gitignore`, `.editorconfig`, `eslint.config.mjs`, `vitest.config.ts`, `.env.example`, `docker-compose.yml`, `app/layout.tsx`, `app/page.tsx`, `README.md`
- Test: `tests/unit/smoke.test.ts`

**Interfaces:**

- Produces scripts:
  - `dev`, `build`, `start`, `typecheck` (`tsc --noEmit`), `lint` (`eslint . && prettier --check .`), `format`
  - `test` (`vitest run --project unit`), `test:integration` (`vitest run --project integration`)
  - `db:migrate` (`prisma migrate deploy`), `db:dev` (`prisma migrate dev`), `seed` (`tsx prisma/seed.ts`)
- Produces the path alias `@/*` → `./*`.

- [ ] **Step 1:** Write `tests/unit/smoke.test.ts` asserting `expect(1 + 1).toBe(2)`. This proves the runner is wired up.
- [ ] **Step 2:** Create `package.json` with `"name": "gadgetsite"`, `"private": true`, `"type": "module"`, `"engines": { "node": ">=22.13" }` and the scripts above.
  - deps: `next@~15.5`, `react@^19`, `react-dom@^19`, `zod@^4`, `@prisma/client@^7`, `@prisma/adapter-pg@^7`, `pg@^8`
  - devDeps: `prisma@^7`, `typescript@~5.9`, `@types/node@^22`, `@types/react@^19`, `@types/react-dom@^19`, `@types/pg`, `vitest@^5`, `tsx@^4`, `eslint@^9`, `eslint-config-next@~15.5`, `prettier@^3`, `prettier-plugin-tailwindcss@^0.6`
  - Copy `.prettierrc`, `.editorconfig` and `.gitignore` from the zip storefront. Add `lib/generated/` to `.gitignore` and `.prettierignore`.
- [ ] **Step 3:** Write `vitest.config.ts` with two projects:
  - `unit`: `tests/unit/**/*.test.ts`, environment `node`
  - `integration`: `tests/integration/**/*.test.ts`, `fileParallelism: false`, `globalSetup: tests/integration/global-setup.ts` (created in Task 6)

  Both resolve `@` to the project root.

- [ ] **Step 4:** Write a minimal `app/layout.tsx` (html/body) and an `app/page.tsx` returning `null`. This page is replaced in Stage 2. Write `docker-compose.yml` with `postgres:16` (db `gadgetsite`, user/pass `gadgetsite`, port 5432) and `redis:7` (6379). In `.env.example` set:
  - `DATABASE_URL=postgresql://gadgetsite:gadgetsite@localhost:5432/gadgetsite`
  - `TEST_DATABASE_URL=postgresql://gadgetsite:gadgetsite@localhost:5432/gadgetsite_test`
  - `REDIS_URL=redis://localhost:6379`
- [ ] **Step 5:** Run `npm install && npm test && npm run typecheck && npm run build`. Expected: 1 test passes, no type errors, and the Next build succeeds.
- [ ] **Step 6:** Commit: `feat(gadgetsite): scaffold standalone Next.js project`.

### Task 2: Money and discount (`lib/domain/money.ts`, `lib/domain/pricing.ts`)

**Interfaces:**

- Produces:
  - `type Locale = 'en' | 'bn'`
  - `assertTaka(n: number): void`: throws `RangeError` unless `Number.isSafeInteger(n)`
  - `formatBDT(amount: number, locale: Locale = 'en'): string`
  - `discountPercent(regular: number, offer: number): number`

- [ ] **Step 1:** Write `tests/unit/money.test.ts`:
  - `formatBDT(185990)` → `'৳1,85,990'`
  - `formatBDT(999)` → `'৳999'`
  - `formatBDT(0)` → `'৳0'`
  - `formatBDT(10000000)` → `'৳1,00,00,000'`
  - `formatBDT(-500)` → `'-৳500'`
  - `formatBDT(185990, 'bn')` → `'৳১,৮৫,৯৯০'`
  - `formatBDT(1.5)`, `formatBDT(NaN)` and `formatBDT(Infinity)` throw `RangeError`
- [ ] **Step 2:** Write `tests/unit/pricing.test.ts`:
  - `discountPercent(100000, 85000)` → `15`
  - `discountPercent(1000, 999)` → `0` (floor of 0.1)
  - `discountPercent(1000, 1000)` → `0`
  - `discountPercent(1000, 1200)` → `0`
  - `discountPercent(0, 0)` → `0`
  - `discountPercent(1000.5, 1)` throws `RangeError`
- [ ] **Step 3:** Run `npm test`. Expected: FAIL, modules not found.
- [ ] **Step 4:** Implement both files.
  - `formatBDT` groups by hand: the last 3 digits, then groups of 2, separated by commas. Don't rely on `Intl` `en-IN` output differing across ICU builds.
  - For `bn`, map the digits `0-9` to `০-৯`.
  - `discountPercent` = `Math.floor(((regular - offer) / regular) * 100)` when `regular > 0 && offer < regular`, else `0`.
- [ ] **Step 5:** Run `npm test`. Expected: PASS.
- [ ] **Step 6:** Commit: `feat(gadgetsite): BDT formatting and computed discount`.

### Task 3: EMI quote (`lib/domain/emi.ts`)

**Interfaces:**

- Produces:
  - `type EmiRate = { tenureMonths: number; percent: number }`
  - `type EmiOption = { tenureMonths: number; percent: number; monthly: number; total: number; interest: number }`
  - `emiOptions(price: number, rates: EmiRate[], minAmount: number): EmiOption[]`: sorted by tenure ascending; `[]` when `price < minAmount`
- Rule (spec §5): `monthly = ceil(price × (1 + percent/100) / tenure)`, `total = monthly × tenure`, `interest = total − price`.

- [ ] **Step 1:** Write `tests/unit/emi.test.ts`:
  - `emiOptions(50000, [{tenureMonths:12, percent:9}], 5000)` → `[{tenureMonths:12, percent:9, monthly:4542, total:54504, interest:4504}]`
  - `emiOptions(30000, [{tenureMonths:6, percent:3.5}], 5000)[0].monthly` → `5175` (exact 5175.00; a float error must not push it to 5176)
  - `emiOptions(30001, [{tenureMonths:3, percent:0}], 5000)[0].monthly` → `10001`
  - `emiOptions(4999, [...], 5000)` → `[]`
  - unsorted input tenures `[12, 3, 6]` come back as `[3, 6, 12]`
  - `emiOptions(50000.5, …)` throws `RangeError`
  - a rate with `tenureMonths: 0` throws `RangeError`
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement.
  - Compute in integer hundredths to avoid float drift: `num = price * Math.round(10000 + percent * 100)`, `den = 10000 * tenure`, `monthly = Math.ceil(num / den)`.
  - Guard with `Number.isSafeInteger(num)`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(gadgetsite): EMI options from admin rates`.

### Task 4: Stock status (`lib/domain/stock.ts`)

**Interfaces:**

- Produces:
  - `type StockStatus = 'in_stock' | 'few_left' | 'out_of_stock' | 'preorder'`
  - `stockStatus(available: number, opts: { lowThreshold: number; preorder: boolean }): StockStatus`

- [ ] **Step 1:** Write `tests/unit/stock.test.ts`:
  - `(10, {lowThreshold:3, preorder:false})` → `in_stock`
  - `(3, …)` → `few_left`
  - `(1, …)` → `few_left`
  - `(0, …)` → `out_of_stock`
  - `(-2, …)` → `out_of_stock` (over-reserved stock is treated as 0)
  - `(0, {lowThreshold:3, preorder:true})` → `preorder`
  - `(5, {lowThreshold:3, preorder:true})` → `in_stock` (stock on hand wins)
- [ ] **Step 2:** Run the test and see it fail. Implement. Run it and see it pass.
- [ ] **Step 3:** Commit: `feat(gadgetsite): computed stock status`.

### Task 5: State machines (`lib/domain/state/{machine,order,payment,shipment}.ts`)

**Interfaces:**

- Produces:
  - `class IllegalTransition extends Error { from: string; to: string }`
  - `defineMachine<S extends string>(edges: Record<S, readonly S[]>): { canTransition(from: S, to: S): boolean; assertTransition(from: S, to: S): void; next(from: S): readonly S[] }`
  - `orderMachine`, `type OrderStatus`
  - `paymentMachine`, `type PaymentStatus`
  - `shipmentMachine`, `type ShipmentStatus`
  - `codMachine`, `type CodStatus`
- Status arrays are exported as `ORDER_STATUSES` (and so on) so Prisma enums can be checked against them in Task 6.

**Edges (from TRD §12.1):**

- **Order:**
  - `cart→[pending_payment, placed, cancelled]`
  - `pending_payment→[placed, booked, payment_failed, cancelled]`
  - `payment_failed→[pending_payment, cancelled]`
  - `booked→[pending_payment, placed, cancelled]`
  - `placed→[confirmed, cancelled]`
  - `confirmed→[processing, cancelled]`
  - `processing→[packed, cancelled]`
  - `packed→[ready_to_ship, cancelled]`
  - `ready_to_ship→[shipped]`
  - `shipped→[out_for_delivery, returned]`
  - `out_for_delivery→[delivered, shipped, returned]`
  - `delivered→[completed, return_requested, exchange_requested]`
  - `completed→[return_requested]`
  - `return_requested→[returned, delivered]`
  - `exchange_requested→[delivered, completed]`
  - `returned→[refunded]`
  - `refunded→[]`
  - `cancelled→[refunded]`
- **Payment:**
  - `initiated→[pending, failed, cancelled, expired]`
  - `pending→[paid, failed, cancelled, expired]`
  - `paid→[refund_pending]`
  - `refund_pending→[refunded, partially_refunded]`
  - `partially_refunded→[refund_pending]`
  - `failed, cancelled, expired, refunded→[]`
- **Shipment:**
  - `created→[pickup_scheduled, cancelled]`
  - `pickup_scheduled→[picked_up, cancelled]`
  - `picked_up→[in_transit]`
  - `in_transit→[at_hub, out_for_delivery]`
  - `at_hub→[in_transit, out_for_delivery]`
  - `out_for_delivery→[delivered, delivery_failed]`
  - `delivery_failed→[rescheduled, returned_to_merchant]`
  - `rescheduled→[out_for_delivery]`
  - `delivered, returned_to_merchant, cancelled→[]`
- **COD:** `pending→[collected]`, `collected→[remitted]`, `remitted→[reconciled]`, `reconciled→[]`

- [ ] **Step 1:** Write `tests/unit/state.test.ts`:
  - Walking the order happy path `cart → pending_payment → placed → … → completed` with `assertTransition` never throws.
  - `orderMachine.assertTransition('pending_payment','shipped')` throws an `IllegalTransition` with `.from === 'pending_payment'` and `.to === 'shipped'`.
  - `paymentMachine.canTransition('failed','paid')` → `false`.
  - `paymentMachine.canTransition('pending','paid')` → `true`.
  - `shipmentMachine.next('delivered')` → `[]`.
  - Every target state in every machine is itself a key (no dangling states).
- [ ] **Step 2:** Run the test and see it fail. Implement `defineMachine` (one `Set` per key) and the four tables. Run it and see it pass.
- [ ] **Step 3:** Commit: `feat(gadgetsite): order, payment, shipment and COD state machines`.

### Task 6: Prisma schema, migration and test database

**Files:**

- Create: `prisma.config.ts`, `prisma/schema.prisma`, `prisma/migrations/*` (generated), `lib/db.ts`
- Create: `tests/integration/global-setup.ts`, `tests/integration/schema.test.ts`, `tests/unit/enums.test.ts`

**Interfaces:**

- Produces: `lib/db.ts` exports `db` (a singleton `PrismaClient` from `@/lib/generated/prisma/client`, built with `new PrismaPg({ connectionString: process.env.DATABASE_URL })`; cached on `globalThis` in dev).
- Produces: `prisma.config.ts` with `schema: 'prisma/schema.prisma'`, `migrations.seed: 'tsx prisma/seed.ts'`, and the datasource URL from `DATABASE_URL`.
- Generator: `provider = "prisma-client"`, `output = "../lib/generated/prisma"`.

**Models.** Use camelCase fields and `@@map` to snake_case tables. Every model has `id String @id @default(cuid())`, `createdAt` and `updatedAt`. Bilingual fields are `xEn` and `xBn String @default("")`.

- **Catalog:**
  - `Category(slug @unique, parentId?, nameEn, nameBn, iconUrl?, sort, active)`
  - `Brand(slug @unique, nameEn, nameBn, logoUrl?, sort, active)`
  - `Product(slug @unique, titleEn, titleBn, brandId, categoryId, descriptionHtmlEn, descriptionHtmlBn, seo Json, faq Json, status ProductStatus[draft|active|archived], preorder Boolean, bookingAmount Int?, lowStockThreshold Int @default(3), warrantyEn, warrantyBn)`
  - `Variant(productId, sku @unique, color?, storage?, ram?, region?, offerPrice Int, regularPrice Int, stock Int, images String[], sort)`
  - `Badge(code @unique, labelEn, labelBn, color)` + `ProductBadge(@@id([productId, badgeId]))`
  - `CarePlan(nameEn, nameBn, price Int, coverageMonths, descriptionEn, descriptionBn)` + `ProductCarePlan`
  - `Addon(productId, addonProductId, discount Int)`
  - `Filter(categoryId, key, labelEn, labelBn, values Json)`
- **Content:**
  - `Page(slug @unique, titleEn, titleBn, bodyHtmlEn, bodyHtmlBn, seo Json, kind[policy|about|blog|custom], publishedAt?)`
  - `Layout(page @unique, sections Json, publishAt?, expireAt?)`
  - `Banner(placement, imageUrlEn, imageUrlBn, link?, altEn, altBn, sort, publishAt?, expireAt?, devices String[])`
  - `Menu(location @unique, items Json)`
  - `MegaMenu(categoryId, layout[cols3|cols2|cols6|list], rowsPerCol Int, items Json, sort)`
  - `ExploreBrand(@@id([categoryId, brandId]), sort)`
  - `TickerItem(textEn, textBn, link?, sort)`
  - `Branch(nameEn, nameBn, addressEn, addressBn, phone, mapUrl?)`
  - `Setting(key @id, value Json)`
- **Money and EMI:**
  - `EmiBank(nameEn, nameBn, logoUrl?, minAmount Int)`
  - `EmiRate(bankId, tenureMonths, percent Decimal(5,2), type[normal|website], @@unique([bankId, tenureMonths, type]))`
  - `PaymentFee(method @unique, percent Decimal(5,2), payer[customer|merchant])`
- **Commerce:**
  - `Customer(phone @unique, name?, email?)`, `Address(customerId?, division, district, upazila, area, street, landmark?, courierAreaIds Json)`
  - `Order(number @unique, customerId?, phone, status OrderStatus, itemsTotal, discountTotal, deliveryFee, paymentFee, emiInterest, grandTotal (all Int), paymentMethod, deliveryMethod, addressSnapshot Json, notes?)`, `OrderItem(orderId, variantId, titleSnapshot Json, unitPrice Int, qty Int, carePlanId?, lineTotal Int)`
  - `OrderEvent(orderId, from, to, actor, reason?, at)`
  - `PaymentProvider(id @id, enabled, mode[sandbox|live], configEncrypted Bytes?, feePercent Decimal, feePayer)`
  - `PaymentAttempt(orderId, provider, amount Int, status PaymentStatus, providerTxnId?, request Json?, response Json?)`
  - `Payment(orderId, method, amount Int, status)`
  - `Refund(paymentId, amount Int, method, status, slaDueAt, providerRef?)`
  - `Courier(id @id, enabled, mode, configEncrypted Bytes?)`
  - `CourierRule(zone, minWeight, maxWeight, minCod, maxCod, priority, courierId, baseRate Int)`
  - `CourierArea(courierId, externalId, division, district, area, @@unique([courierId, externalId]))`
  - `Shipment(orderId, courierId, consignmentId?, trackingUrl?, status ShipmentStatus, codStatus CodStatus?, charge Int, codAmount Int, labelUrl?)`, `ShipmentEvent(shipmentId, status, raw Json, at)`
  - `CodSettlement(courierId, period, expected Int, received Int, status)`
  - `StockReservation(variantId, qty, orderId?, sessionId, expiresAt, status[active|converted|released])`
- **Reliability:**
  - `WebhookLog(source, eventId, headers Json, body String, status, receivedAt, @@unique([source, eventId]))`
  - `IdempotencyKey(key @id, requestHash, response Json?, createdAt)`
  - `OtpCode(phone, codeHash, expiresAt, attempts)`
  - `RiskFlag(phone, reason, score)`
- **Engagement:**
  - `PreorderRequest(nameEn?, phone, productText, status)`
  - `Wishlist(customerId, productId, @@unique)`
  - `Review(productId, customerId, rating, body, status)`
  - `LoyaltyLedger(customerId, delta Int, reason)`
- **Admin:**
  - `AdminUser(email @unique, passwordHash, totpSecretEncrypted Bytes?, active)`
  - `Role(name @unique)`, `Permission(code @unique)`, `RolePermission`, `UserRole`
  - `AuditLog(actorId?, action, entity, entityId, before Json?, after Json?, ip?, at)`

The Prisma enum values must equal the `*_STATUSES` arrays from Task 5.

- [ ] **Step 1:** Write `tests/unit/enums.test.ts`. Import the generated enums `OrderStatus`, `PaymentStatus`, `ShipmentStatus` and `CodStatus` from `@/lib/generated/prisma/enums`, and assert that `Object.values(...).sort()` equals the sorted `ORDER_STATUSES` (etc.).
- [ ] **Step 2:** Write `tests/integration/global-setup.ts`. It points `DATABASE_URL` at `TEST_DATABASE_URL`, drops and recreates `gadgetsite_test`, and runs `prisma migrate deploy`. Write `tests/integration/schema.test.ts`:
  - Creating a category, brand, product and variant round-trips.
  - A second product with the same slug rejects with Prisma code `P2002`.
  - A second `WebhookLog` with the same `(source, eventId)` rejects with `P2002`.
  - A second `IdempotencyKey` with the same `key` rejects with `P2002`.
- [ ] **Step 3:** Start Postgres. Locally that's `sudo pg_ctlcluster 16 main start`, or `docker compose up -d postgres` with `.env` copied from `.env.example`. Create the role and database, then run `npm test` and `npm run test:integration`. Expected: FAIL, no schema yet.
- [ ] **Step 4:** Write `prisma.config.ts`, `prisma/schema.prisma` and `lib/db.ts`. Then run `npx prisma migrate dev --name init` and `npx prisma generate`. Add `"postinstall": "prisma generate"` to the scripts.
- [ ] **Step 5:** Run `npm test && npm run test:integration && npm run typecheck`. Expected: PASS.
- [ ] **Step 6:** Commit: `feat(gadgetsite): full Prisma schema and initial migration`.

### Task 7: Seed (`prisma/seed.ts`, `prisma/seed-data/*.ts`)

**Interfaces:**

- Produces: `seed(db: PrismaClient): Promise<void>`, exported for tests. The CLI entry calls it with `db`.
- Seeds:
  - **Roles:** `owner, manager, catalog, content, orders, support, finance`.
  - **Permissions:**
    - `catalog.read`, `catalog.write`
    - `content.read`, `content.write`
    - `orders.read`, `orders.write`
    - `refunds.write`
    - `payments.config`, `couriers.config`
    - `customers.read`
    - `users.manage`
    - `audit.read`
    - `settings.write`

    `owner` gets all of them.

  - **Settings (TRD §9 defaults):**
    - `motion` = `{heroCycleMs:4850, heroSlideMs:280, heroEasing:'cubic-bezier(.22,.8,.2,1)', tickerPxPerS:78, wipeMs:200, tileFadeMs:280}`
    - `delivery` = `{freeOver:999}`
    - `site` = `{nameEn:'gadgetsite', nameBn:'gadgetsite', logoUrl:null}`
    - `theme` = the token map from the reference CLAUDE.md: `bg #2c2b27`, `surface #373330`, `headerFrom #302c29`, `headerTo #151513`, `panel #3a332c`, `sand #d2a679`, `activeRow #5e5243`, `dot #eab51a`, `ink #14181b`, `success #1a9b3a`, `sale #ff6b6b`
  - **Payment providers** `bkash`, `sslcommerz`, `aamarpay`, `cod` and `bank`, and **couriers** `pathao`, `steadfast`, `redx`, `own` and `pickup`. Create them disabled, in `sandbox` mode, with no config. `cod` and `pickup` are enabled.
  - **Sample catalog:**
    - **Categories:** phones, tablets, laptops, wearables, audio, tv, home-appliances, accessories (with bn names).
    - **Brands:** ≥10 (Apple, Samsung, Xiaomi, OnePlus, Google, Lenovo, Asus, Sony, JBL, Anker).
    - **Products:** ≥24, each with 1–4 variants and real-looking specs, images pointing to `/ph.svg`, and badges `hot`, `new`, `official`.
    - **Pages:** about, plus policy page stubs with `titleEn` and `titleBn` and an empty body, for admin to fill.
    - **Menu:** `header`, built from the categories.
  - Do **not** seed EMI banks or rates (spec §1 assumption: only catalog data).
- Idempotent: `upsert` on every unique key.

- [ ] **Step 1:** Write `tests/integration/seed.test.ts`:
  - After `seed(db)` twice, `db.product.count()` is ≥ 24 and the same after both runs.
  - `db.role.count()` is `7`.
  - `db.emiRate.count()` is `0`.
  - `db.order.count()` is `0`.
  - Every variant has `offerPrice <= regularPrice`, and both are integers.
  - The `motion` setting's `heroCycleMs` is `4850`.
- [ ] **Step 2:** Run `npm run test:integration`. Expected: FAIL.
- [ ] **Step 3:** Implement the seed data modules and `seed()`.
- [ ] **Step 4:** Run `npm run test:integration && npm run seed`. Expected: PASS, and the seed logs its counts.
- [ ] **Step 5:** Commit: `feat(gadgetsite): idempotent seed with sample catalog and defaults`.

### Task 8: CI and docs

**Files:**

- Create: `../.github/workflows/gadgetsite.yml`
- Modify: `README.md`
- Create: `docs/integrations-status.md`

- [ ] **Step 1:** Write the workflow:
  - Triggers on `push` and `pull_request` with `paths: ['gadgetsite/**', '.github/workflows/gadgetsite.yml']`, with `defaults.run.working-directory: gadgetsite`.
  - Services: `postgres:16` (health-checked) and `redis:7`.
  - Steps: `actions/checkout`, `actions/setup-node` (node 22, npm cache on `gadgetsite/package-lock.json`), `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:integration` with `TEST_DATABASE_URL` set, `npm run build`.
  - Match the action versions used in the root `ci.yml`.
- [ ] **Step 2:** In `README.md`, cover setup (Postgres/Redis via compose or local), env, scripts and the stage roadmap from spec §12. In `docs/integrations-status.md`, add a table of every provider with the status `not started` and the sandbox host the network policy has to allow.
- [ ] **Step 3:** Run `npm run lint && npm run typecheck && npm test && npm run test:integration && npm run build`. Expected: all green.
- [ ] **Step 4:** Commit: `ci(gadgetsite): lint, typecheck, unit, integration and build`. Then push.

---

## Later stages (separate plans, written when the previous stage lands)

Stage 2 catalog read path and storefront port · 3 admin core · 4 admin content · 5 checkout · 6 payments · 7 shipping · 8 accounts, notifications, Playwright matrix, hardening. See spec §12.
