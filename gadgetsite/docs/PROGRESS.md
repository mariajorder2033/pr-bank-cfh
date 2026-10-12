# gadgetsite: progress report

_As of 12 October 2026, commit after `a9a6c8b` on branch `claude/brave-franklin-rwbrli`._

gadgetsite is an online electronics store for Bangladesh. One Next.js 15 app holds the
storefront, the `/admin` panel and the API, on PostgreSQL 16 and Redis 7. It is built from the
PRD, TRD and HTML prototypes in the original upload (`docs/reference/`).

**Overall:** stages 1 and 2 and customer accounts are done. Stage 3 (admin core) is built
except its end-to-end test task and final review. Stages 4 to 8 (content admin, checkout,
payments, couriers, notifications and deploy) are not started, so **nobody can place an order
yet.**

## 1. Verified status

All checks were run on 12 October 2026 against real PostgreSQL 16 and Redis 7:

| Check                                          | Result                                  |
| ---------------------------------------------- | --------------------------------------- |
| Unit tests (`npm test`)                        | 73 / 73 passed (20 files)               |
| Integration tests (`npm run test:integration`) | 118 / 118 passed (17 files)             |
| End-to-end tests (`npm run test:e2e`)          | 36 / 36 passed (Chromium)               |
| Typecheck (`npm run typecheck`)                | 0 errors                                |
| Lint and Prettier (`npm run lint`)             | 0 problems                              |
| Production build (`npm run build`)             | OK: 48 dynamic routes, 26 of them admin |

## 2. What is done

### Stage 1: Foundation (done and reviewed)

- **Project setup:** Next.js 15.5, React 19, strict TypeScript, Tailwind, Prisma 7 with the
  `pg` adapter, Docker Compose for PostgreSQL and Redis.
- **Database schema** covering catalog, content, customers, orders, payments, shipments, staff,
  roles and audit, plus 7 migrations.
- **Pure domain logic:**
  - whole-taka money (`৳1,85,990`)
  - discount %, effective price and sale windows
  - EMI
  - stock status
  - variant picking
  - Bangladeshi phone normalising
  - state machines for orders, payments, shipments and COD
- **Idempotent seed:** sample products, staff roles and default settings. It never overwrites
  admin edits.
- **GitHub Actions CI** (`.github/workflows/gadgetsite.yml`): lint, typecheck, unit,
  integration, build and e2e.

### Stage 2: Storefront (done and reviewed)

- **Header:**
  - mega menus
  - an "Explore all" category→brand panel
  - search
  - wishlist, compare and account links
  - a cart drawer
  - English/Bangla toggle
  - light/dark theme toggle
- **Pages:**
  - home (hero slider, ticker, product rows)
  - category, with URL filters for brand, price, in-stock and sort, plus paging
  - product page, with variants, EMI and pre-order
  - brands, search, online exclusive, pre-order and EMI policy
  - blog
  - CMS pages
  - wishlist and compare
  - a 404 page
- **Cart without login:** it is saved in the browser.
- **Caching:** all content comes from the database through the data cache, and admin saves
  refresh it.
- **Layout and motion:**
  - mobile-first breakpoints: ≤700, 701–1100 and ≥1101 px
  - smooth animations that respect "reduce motion"
  - self-hosted Outfit and Noto Sans Bengali fonts
- **Share previews:** Facebook and other social links show the product image with its name and
  price (`/products/[slug]/opengraph-image`, Open Graph and Twitter tags).

### Customer accounts (done and reviewed)

- **Sign-up** with name, mobile number and password (argon2id).
- **Login two ways:** mobile + password, or mobile + 6-digit SMS code. An SMS login creates the
  account for a new number.
- **Login records:** the time and IP of every login are kept on the customer, with a session
  history.
- **Account page:** profile, password change and logout.
- **Protections:**
  - Redis rate limits, which refuse logins if Redis is down
  - SMS caps: 10 per phone per day, plus a shop-wide hourly budget
  - an anti-takeover rule for numbers that were never verified
- **SMS gateway: BulkSMSBD.** Its key and sender ID are set in admin; `.env` is the fallback.

### Stage 3: Admin core (built; e2e task and final review pending)

- **Sign-in:** email + password, then TOTP 2FA (Google Authenticator and similar apps) with QR
  setup. Sessions last 12 h, use a strict cookie and are logged.
- **Roles and permissions:** every page and action is checked. A "forbidden" page is shown when
  staff lack the permission.
- **Audit log:** every admin write is logged in the same database transaction.
- **Products:**
  - add and edit
  - variants with their own price, stock and SKU
  - images (upload and resize)
  - specs and rich descriptions (sanitised)
  - badges and care plans
  - SEO fields
  - sale price with start and end dates
  - visibility
- **Bulk price and stock editor.**
- **Catalog:** categories, brands, badges and care plans.
- **Footer management:** columns, links, contact, social and payment logos. The footer is
  redesigned to match the prototype.
- **Customers:** list and search, with last login, IP and sessions for each.
- **Staff, roles, settings and audit:**
  - staff users and role editor
  - site settings: brand, contact, theme and motion
  - audit log viewer
- **API and service keys:** a write-only screen, AES-256-GCM encrypted, showing only the last 4
  characters. The SMS gateway is wired to it now; payment and courier keys plug into it later.

## 3. Screenshots

- `docs/screenshots/`: 43 storefront and customer-account pages, on desktop, phone and in
  Bangla.
- `docs/screenshots/admin/`: 19 admin pages, from login and 2FA through the dashboard and every
  screen above, plus the phone view.

To regenerate them:

```sh
node scripts/screenshots.mjs
ADMIN_EMAIL=… ADMIN_PASSWORD=… ADMIN_TOTP_SECRET=… node scripts/admin-screenshots.mjs
```

Both scripts need a running server.

## 4. What remains (in order)

1. **Finish Stage 3**
   - `tests/e2e/admin.spec.ts`: login with 2FA, a product edit showing on the storefront, and
     forbidden access for a support role.
   - Fix the product editor's sticky Save bar, which covers the description preview.
   - Final review of the stage.
2. **Stage 4: content admin**
   - home-page builder
   - banners
   - menus, mega menus and ticker
   - pages and blog (rich editor)
   - promotions and coupons
   - EMI banks and rates
   - pre-order requests
   - CSV import and export
3. **Stage 5: checkout**
   - login required at checkout
   - saved and shipping addresses
   - the full Bangladesh hierarchy: division → district (জেলা) → upazila → area
   - shipping charges by zone: city corporation, municipal or rural
   - stock holds and duplicate-safe orders
   - cash on delivery and bank transfer
4. **Stage 6: payments**
   - bKash, SSLCommerz and aamarPay, sandbox first
   - webhooks, reconciliation and refunds
   - keys set in admin
5. **Stage 7: couriers**
   - Pathao, Steadfast and RedX
   - courier rules and fallback
   - COD ledger
6. **Stage 8: release**
   - notifications by SMS and email
   - the full Playwright matrix
   - security hardening
   - deployment

### Known minor issues (deferred)

- **Product page:** the variant image doesn't swap in, there is no quantity limit, and
  pre-order allows a missing booking amount.
- **Theme and errors:** some theme tokens are unused, and there is no custom `error.tsx` page.
- **Search:** the Postgres trigram index exists, but search doesn't use it yet.
- **Login lockouts:** they are per phone only.
- **Performance:** `currentCustomer` runs twice on some requests.

## 5. Keys and accounts you will need

| What                          | Where to set it             | Status                                                                                    |
| ----------------------------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| `SESSION_SECRET`              | `.env`                      | Required. Generate with `openssl rand -hex 32`.                                           |
| `CREDENTIALS_KEY`             | `.env`                      | Required. Generate with `openssl rand -hex 32`. Losing it loses the saved keys.           |
| BulkSMSBD API key + sender ID | Admin → Settings → API keys | Code is written but **not tested against the live API** (blocked from the build machine). |
| bKash / SSLCommerz / aamarPay | Admin (Stage 6)             | Not built yet                                                                             |
| Pathao / Steadfast / RedX     | Admin (Stage 7)             | Not built yet                                                                             |

`docs/integrations-status.md` has the details for each provider.

## 6. How to run it (on your computer or in Claude Code)

You need Node.js 22.13 or newer, and Docker (or a local PostgreSQL 16 and Redis 7).

```sh
cd gadgetsite
cp .env.example .env                 # then set SESSION_SECRET and CREDENTIALS_KEY
docker compose up -d                 # PostgreSQL + Redis
npm install
npm run db:migrate
npm run seed
npm run admin:create -- --email you@example.com --role owner   # asks for a password (12+ chars)
npm run dev                          # http://localhost:3000 and http://localhost:3000/admin
```

On your first admin login, scan the QR code with an authenticator app. To see SMS login codes
in development, set `SMS_PROVIDER=console` in `.env`; the codes print in the terminal.

To run the tests:

```sh
npm test
npm run test:integration
npm run test:e2e
```

## 7. Documents in this package

- `docs/reference/PRD.md`, `docs/reference/TRD.md` and `docs/reference/prototypes/*.html`:
  copied from the original upload.
- `original-upload/gadgetsite-all.zip`: the exact zip you uploaded, unchanged.
- `docs/superpowers/specs/`: the design spec.
- `docs/superpowers/plans/`: the stage plans, with tasks and tests.
- `CLAUDE.md`: guidance for continuing the work in Claude Code.

No video was uploaded in this conversation; the zip above was the only file.
