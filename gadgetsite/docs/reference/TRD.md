# TRD — gadgetsite (Dazzle-style Store)

Version 1.1 · adds measured motion/layout implementation (§9), responsive rules (§10) and test matrix (§11).

## 1. Stack
- **Frontend:** Next.js 15 (App Router, ISR/SSR for SEO), TypeScript, Tailwind, next-intl (bn/en).
- **Admin:** Same repo, `/admin` route group (or separate Vite React app), shadcn/ui, TanStack Table, dnd-kit for builders, TipTap rich editor.
- **API:** NestJS (REST + OpenAPI), Zod validation.
- **DB:** PostgreSQL (Prisma). **Cache/queue:** Redis + BullMQ. **Search:** Meilisearch (typo-tolerant, Bangla ok).
- **Storage/CDN:** S3-compatible + Cloudflare (image resizing, WebP/AVIF).
- **Payments:** SSLCommerz (cards, EMI, MFS), bKash, Nagad, COD. **SMS:** local gateway. **Email:** SES.
- **Hosting:** Docker on VPS/ECS, GitHub Actions CI/CD, Sentry, Grafana.

## 2. Architecture
Browser → CDN → Next.js → NestJS API → Postgres / Redis / Meilisearch / S3.
Everything on the storefront is read from the API; page layout is JSON from the **Home Builder**. Header/menu/ribbon/footer data is cached at the edge and revalidated on admin save.

## 3. Core data model
- `products(id, slug, title, brand_id, category_id, description_html, seo, faq_json, status)`
- `variants(id, product_id, color, storage, ram, region, sku, offer_price, regular_price, stock, images)`
- `care_plans(id, name, price, coverage_months, description)` + `product_care_plans`
- `addons(product_id, addon_product_id, discount)` (Buy More Save More)
- `badges`, `product_badges` (Hot, New, Official, Few Left)
- `categories(parent_id)`, `brands`, `filters`
- `emi_banks(id, name, min_amount)`, `emi_rates(bank_id, tenure, percent, type[normal|website])`
- `payment_fees(method, percent)`
- `orders`, `order_items`, `payments`, `refunds(method, sla_days)`, `shipments`
- `preorder_requests`, `customers`, `wishlists`, `reviews`, `loyalty_ledger`
- `pages(slug, lang, body_html, seo)` — policies/about/blog
- `layouts(page, sections_json, publish_at, expire_at)` — home & landing builder
- `banners`, `menus`, `ticker_items`, `branches`, `settings(key, json)`
- `mega_menus(category_id, layout[cols3|cols2|cols6|list], rows_per_col, items_json, sort)` — dropdown content per menu-row item
- `explore_brands(category_id, brand_id, sort)` — brand tiles shown per category inside EXPLORE ALL (each category has its own list)
- `settings` motion keys (all with defaults from §9): `motion.hero_cycle_ms`, `motion.hero_slide_ms`, `motion.ticker_px_per_s`, `motion.wipe_ms`, `motion.tile_fade_ms`
- `users, roles, permissions, audit_logs`

## 4. Key APIs
`GET /products?category&brand&min&max&stock&color&sort` · `GET /products/:slug` · `GET /layouts/home` · `POST /cart` · `POST /checkout` · `POST /emi/quote` · `POST /preorder-requests` · `GET /pages/:slug` · Admin CRUD: `/admin/*` (JWT + RBAC, 2FA).

## 5. Business rules
- Price shown = variant offer price; toggle shows regular price + "EMI from ৳X/month".
- EMI monthly = (price × (1 + rate%)) / tenure. Rates come only from `emi_rates`.
- Discount % = (regular − offer) / regular, computed, never typed.
- Stock is per variant; product page and listings read the same value (fixes mismatch seen in screenshots).
- Booking: minimum booking amount per product.
- Free delivery over ৳999; delivery ETA per zone.
- Refund SLA per payment method; refunds go back to original method.
- Flash-sale timers server-driven; layouts publish/expire on schedule.

## 6. Security & performance
RBAC, audit log for every admin change, rate limiting, CSRF, input sanitising for rich text, image upload scanning, HTTPS/HSTS. ISR with on-demand revalidation when admin saves. Lighthouse ≥90 mobile. Daily DB backups, 30-day retention.

## 7. Environments & delivery
dev → staging → prod. Migrations via Prisma. Seed script creates roles, EMI banks, default pages from the uploaded policies.

## 8. Milestones
1. Auth, catalog, admin CRUD (3 wks) 2. Storefront pages + search (3) 3. Cart, checkout, payments, EMI (3) 4. Home Builder, CMS, promotions (2) 5. Orders/refunds, notifications, QA, launch (2).
## 9. Frontend motion implementation (measured from the reference recording, 0:00–0:40)
Constants live in `packages/ui/motion.ts` and are overridable via `settings.motion.*`; never scatter magic numbers.

| Constant | Value | Notes |
|---|---|---|
| `HERO_CYCLE_MS` | 4850 | hold ≈ 4550 + slide 280 |
| `HERO_SLIDE_MS` / easing | 280 / `cubic-bezier(.22,.8,.2,1)` | fast start, soft stop |
| Hero geometry | `--sw: 66.1%`, `--gap: 24px`, aspect 875:441 | phone `--sw: 88%`/12px, tablet `78%`/16px |
| `TICKER_PX_PER_S` | 78 | `duration = (trackWidth/2) / 78` computed on mount/resize |
| `WIPE_MS` | 200 | dropdown/Explore All `clip-path` top-down reveal |
| `TILE_FADE_MS` | 280 | category tile → cream |
| Chevron / chip hover | 200 / 150 ms | rotate 180°, colour to sand |

**Hero slider.** Track = flex row of slides (`flex: 0 0 var(--sw)`, `gap: var(--gap)`). Step: move last slide to the front without transition, set `translateX(calc(-1 * (var(--sw) + var(--gap))))`, force reflow, then transition to `none` — the new banner enters from the left. Dots toggle `.on` (9 px; active 28 px pill). Use one interval handle per instance; pause when `document.hidden`; with `prefers-reduced-motion` switch to fade/no autoplay. Slides, links, schedule and device visibility come from `layouts.sections_json`.

**Dropdowns / Explore All.** One panel element per menu item, opened on `pointerenter` (mouse) or tap (touch). Opening or switching removes and re-adds the `.on` class after a reflow so the wipe (`@keyframes` on `clip-path: inset(0 0 100% 0) → inset(0)`) replays. Closing (pointer leaves the menu row, tap outside, Esc) is instant — no exit animation. Explore All category rows swap the right-hand grid synchronously from `explore_brands` and reset `scrollTop`. Keyboard: arrow keys move between items, Esc closes, focus is trapped inside the open panel.

**Ribbon.** CSS marquee (`translateX(0 → -50%)`, duplicated track). `position: sticky; top: 0; z-index: 40`. A passive scroll listener (or IntersectionObserver on a sentinel) toggles `.stuck` when its top ≤ 0 and `scrollY > 0`; `.stuck` adds `rgba(66,62,57,.96)`, `backdrop-filter: blur(8px)`, 14 px bottom radius, soft shadow, `background .25s`. **The header and menu row are not sticky.**

**Performance rules.** Animate only `transform`, `opacity`, `clip-path` and `background-color`; `will-change: transform` on the hero track only; no layout-thrashing reads inside scroll handlers; all motion honours `prefers-reduced-motion`.

## 10. Responsive implementation
- Mobile-first CSS; breakpoints ≤ 700 / 701–1100 / ≥ 1101 (desktop reference = 1536 CSS px, container 1328 px).
- Header: grid/flex-wrap (logo + icons, search `flex: 1 1 100%`, link row and category chips `overflow-x: auto`, scrollbars hidden). Top line scrolls sideways on small screens.
- Dropdown panels: absolute under the menu row; ≤ 1100 px they are full-width sheets, `max-height: 62vh`, `overflow: auto`; mega lists become 2 columns, Explore All uses `grid-template-columns: repeat(auto-fill, minmax(78px, 1fr))`.
- Safety net: `html, body { overflow-x: clip }`, but layout must not rely on it — the test in §11 checks real geometry.
- Fixed elements (Send message tab) shrink on phones; negative-margin tricks must use `min()`/`clamp()` against the viewport.

## 11. Test matrix (CI)
- Playwright at 375×812, 768×1024, 1024×768, 1440×900, 1536×694 (DPR 1.25): (1) no element extends past the viewport unless inside an overflow container; (2) zero `pageerror`/console errors; (3) hover Accessories → panel has 6 columns and 7 rows, left edge = menu bar left; (4) hover EXPLORE ALL → opens, category change swaps the grid, pointer-out closes instantly; (5) after one hero cycle the active slide's left edge equals the container's left edge; (6) scroll 200 px → ribbon `top = 0` with `.stuck`, menu row not fixed.
- Visual regression: screenshot pairs against the reference frames (idle, mega, Explore All, scrolled) with a tolerance on text/artwork areas.
- Lighthouse mobile ≥ 90; axe accessibility run on header, menus and footer.
- Gotcha caught in the prototype: inline scripts shared one global scope and a duplicate `const` name broke the page — in the app, use ES modules and lint with `no-redeclare`/`no-shadow`.

## 12. Commerce architecture: checkout, payments, couriers
All third-party integrations sit behind adapters, so a provider can be added, switched or disabled from the admin panel without code changes elsewhere.

```ts
interface PaymentProvider {
  id: 'bkash'|'nagad'|'rocket'|'upay'|'sslcommerz'|'aamarpay'|'shurjopay'|'bank'|'cod'
  init(order, attempt): Promise<{ redirectUrl?: string; sessionId?: string; token?: string }>
  verify(attempt): Promise<{ status: 'paid'|'failed'|'cancelled'|'pending'; amount: number; providerTxnId: string }>
  refund(payment, amount, reason): Promise<{ status: 'pending'|'done'|'failed'; refId: string }>
  parseWebhook(req): { attemptId: string; raw: unknown }   // after signature check
}
interface CourierProvider {
  id: 'pathao'|'steadfast'|'redx'|'paperfly'|'ecourier'|'own'|'pickup'
  areas(): Promise<Area[]>                                  // city/zone/area for the address form
  quote(parcel): Promise<{ charge: number; etaHours: number }>
  createShipment(order): Promise<{ consignmentId: string; trackingUrl?: string }>
  track(consignmentId): Promise<ShipmentEvent[]>
  cancel(consignmentId): Promise<void>
  parseWebhook(req): ShipmentEvent
}
```
Provider details (endpoint paths, auth headers, signature schemes, field names) **must be taken from each provider's current official documentation and tested in its sandbox before launch**; they change, so they are not hard-coded in this document. Typical shapes: bKash tokenised checkout (grant token → create payment → customer approves → execute/query → refund API); Nagad merchant gateway (initialise → checkout → callback → verify, with RSA signing); SSLCommerz (create session → hosted page → IPN + validation API → refund API, EMI options); Pathao (OAuth token, city/zone/area, price quote, create order, webhooks); Steadfast (API key + secret headers, create order/bulk, status by consignment/invoice, balance, return requests); RedX (access token, areas, create parcel, tracking).

### 12.1 Order, payment and shipment state machines
- **Order:** `cart → pending_payment → placed → confirmed → processing → packed → ready_to_ship → shipped → out_for_delivery → delivered → completed`; side states `payment_failed`, `cancelled`, `booked` (pre-order), `return_requested → returned → refunded`, `exchange_requested`.
- **Payment attempt:** `initiated → pending → paid | failed | cancelled | expired`; `refund_pending → refunded | partially_refunded`.
- **Shipment:** `created → pickup_scheduled → picked_up → in_transit → at_hub → out_for_delivery → delivered | delivery_failed → rescheduled | returned_to_merchant | cancelled`; COD: `cod_collected → cod_remitted → reconciled`.
Transitions are validated in one service; illegal jumps throw. Every transition writes an `order_events` row.

### 12.2 Checkout flow (server)
1. `POST /checkout/session` — validates cart, locks prices, **reserves stock** (Redis TTL 15 min + DB reservation row), returns totals (items, discounts, delivery quote, payment charge, EMI interest).
2. `POST /checkout/address` and `GET /shipping/areas?q=` — address and serviceability; `POST /shipping/quote` returns options per courier/zone.
3. `POST /orders` — requires an **Idempotency-Key** header; creates order in `pending_payment` (or `placed` for COD after OTP).
4. `POST /payments/:provider/init` — creates a `payment_attempts` row, calls the adapter, returns redirect URL or token.
5. Provider callback (browser) → `GET /payments/:provider/return` only shows a waiting page and triggers `verify`; the **webhook/IPN** (`POST /webhooks/payments/:provider`) and a **reconciliation job** are the sources of truth.
6. On `paid`: order → `placed/confirmed`, stock reservation converted to deduction, notifications queued, invoice generated.
7. On `failed/cancelled/expired`: reservation released, order → `payment_failed`, retry link offered.

### 12.3 Webhooks and reliability
- Verify signature/secret (HMAC or provider scheme) and, where supported, IP allow-list; reject replays (timestamp + nonce); store the **raw payload** in `webhook_logs` before processing; process through a BullMQ queue; dedupe by provider event/transaction ID; return 200 quickly.
- **Reconciliation jobs:** every 5–10 min re-verify `pending` payments older than 3 min; every 10–15 min poll courier status for open shipments (backup for missed webhooks); nightly provider settlement vs `payments` report; nightly COD settlement report.
- Retries with exponential backoff and jitter; timeouts (e.g. 10 s); circuit breaker per provider; automatic **courier fallback** if booking fails (next in rule priority) and alert admin.
- All money as integers (whole taka, or paisa if a provider requires it, converted at the adapter edge). Never trust amounts from the browser.

### 12.4 Data model additions
`payment_providers(id, enabled, mode, config_encrypted, fee_percent, fee_payer)` · `payment_attempts(id, order_id, provider, amount, status, provider_txn_id, request_json, response_json, created_at)` · `payments(id, order_id, method, amount, status)` · `refunds(id, payment_id, amount, method, status, sla_due_at, provider_ref)` · `webhook_logs(id, source, event_id, headers, body, status, received_at)` · `couriers(id, enabled, mode, config_encrypted)` · `courier_rules(id, zone, min_weight, max_weight, min_cod, max_cod, priority, courier_id, base_rate)` · `shipments(id, order_id, courier_id, consignment_id, tracking_url, status, charge, cod_amount, label_url)` · `shipment_events(id, shipment_id, status, raw, at)` · `cod_settlements(id, courier_id, period, expected, received, status)` · `stock_reservations(id, variant_id, qty, order_id, expires_at)` · `order_events(id, order_id, from, to, actor, at)` · `addresses(division, district, upazila, area, courier_area_ids_json)` · `otp_codes(phone, code_hash, expires_at, attempts)` · `idempotency_keys(key, request_hash, response, created_at)` · `risk_flags(phone, reason, score)`.

### 12.5 Admin APIs
`GET/PUT /admin/payment-providers/:id` (secrets write-only) · `POST /admin/payment-providers/:id/test` · `GET/PUT /admin/couriers/:id` · `POST /admin/couriers/:id/test` · `CRUD /admin/courier-rules` · `POST /admin/orders/:id/book-courier` · `POST /admin/orders/bulk-book` · `GET /admin/shipments/:id/label` · `POST /admin/orders/:id/refund` · `GET /admin/reports/cod-settlement` · `GET /admin/reports/payments-reconciliation`.

### 12.6 Security and compliance
Card data never touches our servers (hosted gateway pages → PCI SAQ A scope); provider secrets stored encrypted (KMS/env vault), write-only in admin, masked in logs; HTTPS only; CSRF on forms; rate limiting on OTP, login, coupon and payment init; OTP attempt limits and expiry; fraud rules (COD OTP, repeat returners, velocity); audit log on every credential, rule or refund change; PII minimisation and retention policy.

### 12.7 Testing
Provider **sandbox contract tests** per adapter; mocked providers in CI; webhook replay and duplicate-delivery tests; idempotency tests (double click, retry after timeout); stock-reservation race tests; state-machine unit tests; end-to-end Playwright for COD, bKash (sandbox), card (sandbox) and EMI; courier booking failure/fallback test; refund-SLA timer test.

### 12.8 Monitoring
Alerts for payment-success-rate drop, webhook failure rate, pending payments older than 15 min, courier booking errors, COD settlement mismatches, refund SLA breaches. Dashboards per provider and courier.

### 12.9 Milestones added
6. Payment adapters (bKash, SSLCommerz first, then Nagad/others) and COD (3 wks) 7. Courier adapters (Pathao, Steadfast first) + rules engine + COD ledger (2 wks) 8. Checkout UI, OTP, tracking page, notifications (2 wks) 9. Sandbox certification, load test, go-live checklist (1 wk).
