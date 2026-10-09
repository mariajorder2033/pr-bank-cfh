# gadgetsite Stage 2 — Catalog Read Path and Storefront Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every storefront page from the zip renders from PostgreSQL in English and Bangla. That means the header, mega menus, ribbon, footer, home, category, product, brands, search, pre-order, CMS pages, blog, wishlist and compare. Discount, EMI and stock are computed, and nothing is hard-coded.

**Architecture:**

- **Data access:** server components call `lib/server/catalog.ts` (Prisma queries) through `lib/server/cached.ts` (`unstable_cache` with tags `catalog`, `content`, `settings`).
- **Rendering:** pages are `dynamic = 'force-dynamic'`, so `next build` needs no database. Caching comes from the tagged data cache, which Stage 3 admin writes invalidate.
- **Client components** (cart drawer, wishlist, compare, header search) use small JSON routes under `app/api/`.
- **Porting:** the zip's components are ported, with every `lib/mock.ts` import replaced by database data.

**Tech Stack:** Stage 1 stack plus Tailwind 3.4 + PostCSS + autoprefixer, next-intl 3.26, zustand 5, `pg_trgm`, and `@playwright/test` 1.64 (Chromium at `/opt/pw-browsers`).

**Spec:** `gadgetsite/docs/superpowers/specs/2026-10-09-gadgetsite-design.md` (§6.1, §9). Stage 1 plan: `2026-10-09-stage-1-foundation.md`.

## Global Constraints

- All Stage 1 constraints still hold (whole-taka `Int`, computed discount/EMI/stock, bn/en, Prettier style, standalone project, product-only demo data).
- **Copy.** UI chrome strings live in `messages/{en,bn}.json`. Content (names, titles, ribbon, menus, pages) comes from the database. No literal shopper-facing text in components, apart from the `৳` sign that `formatBDT` produces.
- **Money:** only `formatBDT` (Stage 1) formats money. Delete the zip's `taka()`.
- **Bilingual fallback:** `loc(row, 'title', locale)` returns `titleBn` when `locale === 'bn'` and that value is non-empty, otherwise `titleEn`. Content JSON uses `{ en, bn }` with the same fallback.
- **Header behaviour:** the header and menu row are **not** sticky. Only the ribbon pins (`position: sticky; top: 0`, `.stuck` class once the header has scrolled away; TRD §9).
- **Motion values** come from `settings.motion`. They are never literals in components.
- **Dropdowns:** open with a 200 ms top-down `clip-path` wipe, replay the wipe when switching items, and close instantly.
- **Reduced motion:** honour `prefers-reduced-motion`.
- **Breakpoints:** ≤700 / 701–1100 / ≥1101. No horizontal page scroll at 375, 768, 1024, 1440 or 1536 px.
- **Checkout:** no checkout button or checkout, account or order routes in this stage (they arrive in Stages 5 and 8). The cart drawer shows lines and the subtotal only.
- **Available stock** = `variant.stock − Σ active, unexpired reservations`, clamped at 0 for display.

## Review Focus

1. **Bangla with untranslated rows:** a row whose `*Bn` fields are empty must show its English text, never a blank. Pinned in Task 1 (`loc`) and Task 6 (e2e locale switch).
2. **Fully held or sold-out products:** a product whose variants are all at 0 available, or fully held by active reservations, must show `out_of_stock` (or `preorder`) with add-to-cart disabled. Pinned in Task 3 (reservation test) and Task 6.
3. **Unknown or draft slugs:** an unknown or `draft` product slug, an unknown category and an unknown page all give 404, never a 500. Pinned in Tasks 3 and 6.
4. **Bad builder JSON:** malformed admin layout JSON (an unknown section type or a missing field) skips only that section; the page still renders. Pinned in Task 2.
5. **Hostile search input:** `%`, `'`, `_`, an empty string, or 500 characters must never throw. Empty or whitespace-only input returns `[]`. Also, `min > max` in the price filter returns an empty list, not an error. Pinned in Task 3.

---

### Task 1: Styling, i18n and the `loc` helper

**Files:**

- Create: `tailwind.config.ts`, `postcss.config.mjs`, `app/globals.css` (copied from the zip storefront), `i18n/request.ts`, `messages/en.json`, `messages/bn.json`, `lib/i18n.ts`
- Modify: `next.config.mjs` (wrap with `createNextIntlPlugin('./i18n/request.ts')`), `package.json`
- Test: `tests/unit/i18n.test.ts`

**Interfaces:**

- Produces:
  - `type Locale` (re-exported from `lib/domain/money`)
  - `type Bilingual = { en: string; bn?: string }`
  - `loc<T>(row: T, field: string, locale: Locale): string`: reads `${field}En` / `${field}Bn`
  - `text(value: Bilingual, locale: Locale): string`
  - `getLocale()`: reads the `locale` cookie and defaults to `en` (in `i18n/request.ts`, as in the zip)

- [ ] **Step 1:** Write `tests/unit/i18n.test.ts`:
  - `loc({titleEn:'Phones', titleBn:'ফোন'}, 'title', 'bn')` → `'ফোন'`
  - `loc({titleEn:'Phones', titleBn:''}, 'title', 'bn')` → `'Phones'`
  - `loc({titleEn:'Phones', titleBn:'ফোন'}, 'title', 'en')` → `'Phones'`
  - `text({en:'Sale'}, 'bn')` → `'Sale'`
  - `text({en:'Sale', bn:'সেল'}, 'bn')` → `'সেল'`
- [ ] **Step 2:** Run `npm test`. Expected: FAIL (module missing).
- [ ] **Step 3:** Install `tailwindcss@^3.4 postcss autoprefixer next-intl@^3.26 zustand@^5`.
  - Copy the zip's `tailwind.config.ts` and `app/globals.css`. Set Tailwind `content` to include `app`, `components` and `lib`.
  - Copy `messages/*.json` without the `co.*` keys (checkout is Stage 5). Add `cat.found` ("{count} found" / "{count}টি পাওয়া গেছে"), `cat.budget`, `cat.stock`, `cat.brands`, `cat.sort.*`, `pd.offer`, `pd.regular`, `pd.emiFrom`, `pd.unavailable`, `pd.booking`, `pd.color`, `pd.storage`, `pd.region`, `stock.few`, `stock.preorder` and `misc.sendMessage`, with Bangla for each.
  - Implement `lib/i18n.ts`.
- [ ] **Step 4:** Run `npm test && npm run typecheck && npm run build`. Expected: PASS, and the build succeeds.
- [ ] **Step 5:** Commit: `feat(gadgetsite): tailwind theme, next-intl and bilingual helper`.

### Task 2: Content schemas and storefront seed content

**Files:**

- Create: `lib/content/schemas.ts`
- Modify: `prisma/seed.ts`, `prisma/seed-data/defaults.ts`
- Test: `tests/unit/content-schemas.test.ts`, extend `tests/integration/seed.test.ts`

**Interfaces:**

- Produces Zod schemas and their inferred types:
  - `SiteSettings {nameEn, nameBn, logoUrl: string|null, phone?: string}`
  - `MotionSettings {heroCycleMs, heroSlideMs, heroEasing, tickerPxPerS, wipeMs, tileFadeMs}`
  - `DeliverySettings {freeOver}`
  - `ThemeSettings` (Stage 1 keys)
- Produces `MenuItem = { label: Bilingual; href: string }` and `MegaMenuItem = { label: Bilingual; href: string }`.
- Produces the layout section union:
  - `{ type:'hero'; placement:string }`
  - `{ type:'productRow'; title:Bilingual; band?:boolean; seeAllHref?:string; query: ProductQueryInput }`
- Produces `ProductQueryInput`, a Zod object shared with Task 3: `{ category?: string; brands?: string[]; badge?: string; inStock?: boolean; min?: number; max?: number; sort?: 'newest'|'price_asc'|'price_desc'|'discount'; page?: number; pageSize?: number }`. `pageSize` defaults to 20, maximum 48. `page` defaults to 1, minimum 1. `min` and `max` are non-negative integers.
- Produces `parseSections(raw: unknown): Section[]`. It keeps the valid sections in order and silently drops any entry that fails its schema. A non-array returns `[]`.
- Produces `parseSetting<T>(schema, raw, fallback: T): T`. It returns the fallback when parsing fails, so a broken admin setting never breaks a page.

- [ ] **Step 1:** Write `tests/unit/content-schemas.test.ts`:
  - `parseSections([{type:'hero',placement:'home'}, {type:'bogus'}, {type:'productRow', title:{en:'Hot'}, query:{badge:'hot'}}])` returns 2 sections, typed `hero` and then `productRow`.
  - `parseSections('x')` → `[]`.
  - `ProductQueryInput.parse({pageSize: 500})` throws.
  - `ProductQueryInput.parse({})` → `{page:1, pageSize:20}` (plus defaults).
  - `parseSetting(MotionSettings, {heroCycleMs:'x'}, fallback)` returns `fallback`.
- [ ] **Step 2:** Extend `tests/integration/seed.test.ts`:
  - `layout('home').sections` parses to ≥ 1 `productRow`.
  - the `footer` menu exists.
  - every category has a `MegaMenu` row.
  - `ExploreBrand` rows exist for `phones`.
- [ ] **Step 3:** Run `npm test && npm run test:integration`. Expected: FAIL.
- [ ] **Step 4:** Implement `lib/content/schemas.ts`, then extend the seed. All writes are upserts with `update: {}`.
  - **`home` layout:** `productRow` sections "Hot deals" / "হট ডিল" (`badge:'hot'`, band), "New arrivals" / "নতুন এসেছে" (`badge:'new'`), "Phones" / "ফোন" (`category:'phones'`, band) and "Laptops" / "ল্যাপটপ" (`category:'laptops'`). There is no hero section, because no banners are seeded.
  - **`online-exclusive` layout:** one `productRow` with `sort:'discount'`.
  - **`footer` menu:** links to the 6 policy pages, by title.
  - **One `MegaMenu` per category:** layout `cols2`, items = the brands that have products in that category, linking to `/category/<slug>?brands=<brand>`.
  - **`ExploreBrand` rows:** the same category→brand pairs.
  - Add `site.phone: null` to the defaults (admin fills it in). Seed no ticker items and no banners.
- [ ] **Step 5:** Run `npm test && npm run test:integration`. Expected: PASS.
- [ ] **Step 6:** Commit: `feat(gadgetsite): content schemas and storefront seed content`.

### Task 3: Catalog queries (`lib/server/catalog.ts`)

**Files:**

- Create: `lib/server/catalog.ts`, `lib/server/content.ts`, `prisma/migrations/<ts>_search/migration.sql`
- Test: `tests/integration/catalog.test.ts`, `tests/integration/content.test.ts`

**Interfaces:**

- Consumes: Stage 1 `discountPercent`, `stockStatus`, `emiOptions`, `db`; Task 2 `ProductQueryInput`, `parseSections`, `parseSetting`.
- Produces from `lib/server/catalog.ts`:
  - `type ProductCard = { slug; title: Bilingual; brand: { slug; name: Bilingual }; offerPrice: number; regularPrice: number; discountPercent: number; stockStatus: StockStatus; image: string; badges: { code; label: Bilingual; color }[]; variantId: string }`
    - The price shown is the cheapest variant with available stock > 0, or the cheapest variant overall when none has stock.
    - `variantId` is that variant's id.
  - `listProducts(q: ProductQueryInput, now = new Date()): Promise<{ items: ProductCard[]; total: number }>`
    - Only `status: 'active'` products.
    - `category` matches that category or its direct children.
    - `min` and `max` apply to the shown offer price.
    - `inStock` keeps cards whose `stockStatus` is `in_stock` or `few_left`.
  - `getProductsBySlugs(slugs: string[]): Promise<ProductCard[]>`: active products only, returned in input order, at most 24 slugs.
  - `type ProductDetail = ProductCard & { descriptionHtml: Bilingual; warranty: Bilingual; preorder: boolean; bookingAmount: number | null; variants: { id; sku; color; storage; ram; region; offerPrice; regularPrice; discountPercent; available: number; stockStatus; images: string[] }[]; carePlans: { id; name: Bilingual; price; coverageMonths }[]; emi: { bank: Bilingual; logoUrl: string | null; options: EmiOption[] }[]; category: { slug; name: Bilingual } }`
    - `emi` uses `website`-type rates against the shown offer price. Banks whose options come back empty are dropped.
  - `getProduct(slug: string, now = new Date()): Promise<ProductDetail | null>`: `null` for unknown or non-active products.
  - `searchProducts(term: string, limit = 20): Promise<ProductCard[]>`
    - Trimmed `term` shorter than 2 characters → `[]`; terms are cut to 100 characters.
    - Matches on `pg_trgm` `word_similarity(term, title_en) > 0.3`, `title_bn ILIKE`, or the brand name, ordered by similarity.
    - Uses `$queryRaw` with bound parameters only.
  - `listCategories(): Promise<{ slug; name: Bilingual; parentSlug: string | null }[]>` and `getCategory(slug)` (null if missing or inactive).
  - `listBrands(): Promise<{ slug; name: Bilingual; logoUrl: string | null; productCount: number }[]>`
- Produces from `lib/server/content.ts`:
  - `getSettings(): Promise<{ site; motion; delivery; theme }>`, each passed through `parseSetting` with the Stage 1 defaults as fallback
  - `getMenu(location)` → `MenuItem[]`
  - `getMegaMenus()` → `{ categorySlug; name: Bilingual; layout; rowsPerCol; items: MegaMenuItem[] }[]` in category sort order
  - `getExploreBrands()` → `Record<categorySlug, { slug; name: Bilingual; logoUrl }[]>`
  - `getLayout(page, now)` → `Section[]` (`[]` when outside `publishAt`/`expireAt`)
  - `getBanners(placement, now)`, scheduled the same way, sorted by `sort`
  - `getTicker()` → `Bilingual[]` with links
  - `getPage(slug)` → published only (`publishedAt` set and ≤ now, or kind `policy`/`about` with a non-empty body)
  - `listBlogPosts()`
- Available stock: one `groupBy` on `StockReservation` where `status = 'active'` and `expiresAt > now`, subtracted per variant.
- Migration: `CREATE EXTENSION IF NOT EXISTS pg_trgm;` plus a GIN `gin_trgm_ops` index on `products.title_en`.

- [ ] **Step 1:** Write `tests/integration/catalog.test.ts`. A `beforeAll` runs `seed(db)` and then creates its own fixtures with a `t2-` slug prefix:
  - `listProducts({category:'phones'})`
    - total equals the count of active seeded phones
    - every item has `discountPercent === discountPercent(regularPrice, offerPrice)`
  - `listProducts({min: 100000, max: 50000})` → `{items: [], total: 0}`
  - `listProducts({brands:['apple'], sort:'price_asc'})`: the offer prices come back in non-decreasing order.
  - A draft fixture product never appears in `listProducts`, and `getProduct` returns `null` for it.
  - Reservation case: a fixture with one variant (stock 2) plus an active reservation of qty 2 expiring in 10 minutes gives `stockStatus` `out_of_stock`. With an expired reservation instead, it gives `few_left`.
  - `getProduct('galaxy-buds3-pro')`: `preorder: true`, `bookingAmount: 5000`, `stockStatus: 'preorder'`.
  - With no EMI rates, `getProduct('iphone-16-pro').emi` → `[]`. After inserting a fixture bank (`minAmount: 5000`, a 12-month 9 % website rate), its options equal `emiOptions(offerPrice, [{tenureMonths:12, percent:9}], 5000)`.
  - `searchProducts('galxy')` includes `galaxy-s25-ultra`.
  - `searchProducts('%')`, `searchProducts("'; drop table products;--")` and `searchProducts('x'.repeat(500))` resolve without throwing.
  - `searchProducts(' ')` → `[]`.
  - `getProductsBySlugs(['pixel-9','nope','iphone-16-pro'])` → slugs `['pixel-9','iphone-16-pro']`.
- [ ] **Step 2:** Write `tests/integration/content.test.ts`:
  - `getSettings().motion.heroCycleMs` → `4850`.
  - After setting `motion` to `{"heroCycleMs":"bad"}`, `getSettings().motion` equals the defaults. Restore it afterwards.
  - `getLayout('home')` returns its sections. With `expireAt` set in the past it returns `[]`.
  - `getPage('privacy-policy')` → `null` while the body is empty, and the page once a body is set.
  - `getMegaMenus()` has one entry per seeded category.
- [ ] **Step 3:** Run `npm run test:integration`. Expected: FAIL.
- [ ] **Step 4:** Create the search migration with `npx prisma migrate dev --create-only --name search`, fill in the SQL, and apply it. Implement both modules.
- [ ] **Step 5:** Run `npm run test:integration && npm run typecheck`. Expected: PASS.
- [ ] **Step 6:** Commit: `feat(gadgetsite): catalog and content read path`.

### Task 4: Cached wrappers and JSON routes

**Files:**

- Create: `lib/server/cached.ts`, `app/api/products/route.ts`, `app/api/search/route.ts`, `app/api/preorder-requests/route.ts`
- Test: `tests/integration/api.test.ts`

**Interfaces:**

- Produces from `lib/server/cached.ts`: the same functions as Task 3, wrapped in `unstable_cache(fn, [name], { tags: [tag], revalidate: 300 })`.
  - Tags: `catalog` (products, categories, brands, search), `content` (menus, layouts, banners, ticker, pages, mega menus), `settings`.
  - Also exports `TAGS = { catalog, content, settings } as const`, which Stage 3 calls with `revalidateTag`.
- Routes:
  - **`GET /api/products?slugs=a,b`:** `{ items: ProductCard[] }`. `400` if there are more than 24 slugs.
  - **`GET /api/search?q=`:** `{ items: ProductCard[] }`, at most 8 items.
  - **`POST /api/preorder-requests`:**
    - Body: `{ name?: string (≤80), phone: string matching /^01[3-9]\d{8}$/, productText: string 3–500 }`.
    - Success: `201 { ok: true }`.
    - Validation failure: `400 { error: 'invalid', issues }`.
    - Mutating-request rule (spec §10): a request whose `Origin` header doesn't match `APP_URL` gets `403`. Add `APP_URL=http://localhost:3000` to `.env.example`.

- [ ] **Step 1:** Write `tests/integration/api.test.ts`. It imports the route handlers directly, mocks `next/cache`'s `unstable_cache` as identity (`vi.mock`), and calls them with `new Request(...)`:
  - `GET /api/products?slugs=pixel-9` → 200, `items[0].slug === 'pixel-9'`.
  - 25 slugs → 400.
  - `GET /api/search?q=galxy` → items include `galaxy-s25-ultra`, and `length <= 8`.
  - Pre-order POST with a valid body and `Origin: http://localhost:3000` → 201, and one new `PreorderRequest` row in the database.
  - Phone `12345` → 400.
  - Missing or wrong `Origin` → 403.
- [ ] **Step 2:** Run `npm run test:integration`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run test:integration`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(gadgetsite): cached catalog reads and storefront JSON routes`.

### Task 5: Playwright harness and the chrome (layout, header, ribbon, footer, cart drawer)

**Files:**

- Create: `playwright.config.ts`, `tests/e2e/fixtures.ts`, `tests/e2e/chrome.spec.ts`
- Create (ported from the zip, with mock data replaced): `components/Header.tsx`, `components/MegaMenu.tsx`, `components/ExploreAll.tsx`, `components/Ribbon.tsx`, `components/Footer.tsx`, `components/CartDrawer.tsx`, `components/ThemeToggle.tsx`, `components/LocaleToggle.tsx`, `components/Brand.tsx`, `components/ProductCard.tsx`, `components/Grid.tsx`, `store/cart.ts`, `store/lists.ts`, `lib/ui.ts`
- Modify: `app/layout.tsx`, `package.json` (scripts `test:e2e`: `playwright test`; `e2e:serve`: `next build && next start -p 3100`)

**Interfaces:**

- Consumes: Task 4 cached functions, Task 1 `loc`/`text`, `formatBDT`.
- `app/layout.tsx`:
  - It is a server component. It loads `getSettings`, `getMenu('header')`, `getMegaMenus`, `getExploreBrands`, `getTicker` and `getMenu('footer')`, and passes plain props to the client components.
  - It writes `settings.theme` as CSS variables on `<html style>`: map `bg→--bg`, `panel→--pn`, `sand→--sand`, `sale→--sale`, `success→--ok`.
  - It passes `settings.motion` down through a `MotionProvider` context (`components/MotionProvider.tsx`, `useMotion()`).
  - `metadata.title` comes from `site.nameEn`.
- `store/cart.ts`: zustand `persist` (`gadgetsite-cart`).
  - Lines: `{ variantId, slug, title: Bilingual, price, qty }`.
  - Actions: `add(line)`, which merges on `variantId`; `setQty(variantId, qty)`, which removes the line when `qty <= 0`; and `remove(variantId)`.
  - Prices in the cart are for display only. Stage 5 recomputes them on the server.
- `store/lists.ts`: zustand `persist`, `wish: string[]`, `cmp: string[]` (maximum 4, oldest dropped), `toggle(list, slug)`.
- **Ribbon:** hidden when the ticker is empty. Its duration is computed as `(trackWidth / 2) / tickerPxPerS` on mount and resize. It is `sticky top-0 z-40`, and an IntersectionObserver on a sentinel placed just above it toggles `.stuck`.
- **Dropdowns:** each menu-row item opens its `MegaMenu` panel on `pointerenter` and closes it instantly on `pointerleave` of the row or on `Esc`. Switching items replays the wipe (remove class → `void el.offsetWidth` → add class), and `animationDuration` comes from `motion.wipeMs`. EXPLORE ALL lists the categories; hovering a category swaps the brand grid synchronously and resets `scrollTop` to 0.
- **Footer:** the footer menu links, the site name and phone (the phone is hidden when null), and the newsletter strip text from messages.

- [ ] **Step 1:** Write `playwright.config.ts`:
  - `webServer: { command: 'npm run e2e:serve', port: 3100, reuseExistingServer: !process.env.CI, timeout: 180_000 }`
  - `use.baseURL` `http://localhost:3100`
  - Chromium `launchOptions.executablePath` = `process.env.PLAYWRIGHT_CHROMIUM_PATH` when set
  - one project
  - The server runs against `DATABASE_URL`; CI migrates and seeds it first.
- [ ] **Step 2:** Write `tests/e2e/fixtures.ts`. It exports `test`, which fails the test on any `pageerror` or `console.error`, and `WIDTHS = [375, 768, 1024, 1440, 1536]`. It also exports `expectNoHorizontalOverflow(page)`, which asserts `document.documentElement.scrollWidth <= window.innerWidth`.
- [ ] **Step 3:** Write `tests/e2e/chrome.spec.ts`:
  - At each width, `/` loads with no overflow.
  - The header shows the seeded site name.
  - Hovering the "Phones" menu item shows a panel containing "Apple", and leaving the menu row hides it within one frame.
  - Hovering EXPLORE ALL, then the "Laptops" category, shows "Lenovo" in the brand grid.
  - Clicking the locale toggle switches the "Phones" chip to "ফোন".
  - After `window.scrollTo(0, 400)`, the ribbon has `.stuck` and its bounding top is 0 (skipped when the ticker is empty; the test inserts one ticker item in `beforeAll` via `db`).
  - The header's computed `position` is not `fixed` or `sticky`.
- [ ] **Step 4:** Run `npm run test:e2e`. Expected: FAIL (components not ported).
- [ ] **Step 5:** Port the components and the layout. Delete every reference to `lib/mock`, `lib/api` and `lib/motion`. Use `formatBDT` everywhere.
- [ ] **Step 6:** Run `npm run test:e2e && npm run typecheck && npm run lint`. Expected: PASS.
- [ ] **Step 7:** Commit: `feat(gadgetsite): storefront chrome from the database`.

### Task 6: Pages

**Files:**

- Create: `app/page.tsx` (replaces the Stage 1 stub), `app/category/[slug]/page.tsx`, `app/products/[slug]/page.tsx`, `components/ProductBuy.tsx`, `components/CategoryFilters.tsx`, `components/HeroSlider.tsx`, `app/brands/page.tsx`, `app/search/page.tsx`, `app/online-exclusive/page.tsx`, `app/pre-order/page.tsx` + `components/PreorderForm.tsx`, `app/emi-policy/page.tsx`, `app/about/page.tsx`, `app/blogs/page.tsx`, `app/blogs/[slug]/page.tsx`, `app/[slug]/page.tsx`, `app/wishlist/page.tsx`, `app/compare/page.tsx`, `app/not-found.tsx`
- Test: `tests/e2e/pages.spec.ts`

**Behaviour:**

- **Home:** renders `getLayout('home')` in order. `hero` → `HeroSlider` with `getBanners(placement)`, rendering nothing when there are no banners. Timing comes from `useMotion()`, and the geometry uses `--sw`/`--gap` (`66.1%`/`24px` desktop, `78%`/`16px` at 701–1100, `88%`/`12px` at ≤700). `productRow` → `listProducts(query)`, rendered as a grid with "See all" when `seeAllHref` is set.
- **Category:**
  - Calls `notFound()` when `getCategory` returns null.
  - Filters come from `searchParams`: `brands` (comma list), `min`, `max`, `inStock=1`, `sort`, `page`. They are parsed with `ProductQueryInput.safeParse`, and on failure the defaults are used.
  - `CategoryFilters` is a client component that updates the URL.
  - The page shows "{count} found" and offers pagination when `total > pageSize`.
- **Product:**
  - Calls `notFound()` on null.
  - `ProductBuy` gets the full `ProductDetail`. Choosing color/storage/ram/region selects the matching variant; unavailable combinations are shown disabled. The offer and regular prices, discount badge and stock status all follow the selected variant.
  - "EMI from ৳X/month" uses the lowest `monthly` across `emi`, and is hidden when `emi` is empty. The EMI table lists the banks' options.
  - Add-to-cart is disabled unless the stock status is `in_stock` or `few_left`. A pre-order product shows the booking amount and has add-to-cart disabled; booking checkout comes in Stage 5.
  - The page shows the warranty, care plans (listed, not selectable until Stage 5) and the description HTML. The HTML is rendered with `dangerouslySetInnerHTML`; it is sanitised at write time in Stage 3, and the seed HTML is trusted.
- **Brands:** `listBrands()` with counts, linking to `/search?brand=`. The search page accepts `brand` as a `listProducts({brands:[brand]})` view when there is no `q`.
- **Search:** `searchProducts(q)`, plus an empty state.
- **Online exclusive:** `getLayout('online-exclusive')`, the same renderer as home.
- **Pre-order:** `PreorderForm` posts to `/api/preorder-requests` and shows `pg.sent`, or each field's error.
- **EMI policy:** the `emi-policy` page body (if published) plus a table of EMI banks and rates read from the database. With no banks, it shows the `pg.none` message.
- **About, `/[slug]` and blogs:** `getPage` / `listBlogPosts`, and `notFound()` when null.
- **Wishlist and compare:** client components fetch `/api/products?slugs=`. Compare shows a table of title, price, brand and stock for up to 4 products.

- [ ] **Step 1:** Write `tests/e2e/pages.spec.ts` (with the Task 5 fixtures):
  - At each width, there is no overflow on `/`, `/category/phones`, `/products/iphone-16-pro`, `/brands` or `/search?q=galaxy`.
  - `/` shows the "Hot deals" heading and at least one product card with a `৳` price.
  - `/category/phones?brands=apple` shows only Apple cards. Toggling "In stock" adds `inStock=1` to the URL.
  - `/products/iphone-16-pro`:
    - The first variant's price is shown.
    - Choosing "256GB" changes the price to `৳1,74,999`.
    - Choosing "Black Titanium" (stock 0) shows `pd.unavailable` and disables add-to-cart.
    - Adding the first variant raises the cart count to 1.
  - `/products/galaxy-buds3-pro` shows `৳5,000` booking and a disabled add-to-cart.
  - `/products/does-not-exist`, `/category/nope` and `/nope-page` each return status 404.
  - Pre-order form: an invalid phone shows an error, and a valid submission shows `pg.sent`.
  - Wishlist: liking a card, then visiting `/wishlist`, shows that product.
  - Locale `bn`: `/category/phones` shows "ফোন", and products without Bangla titles still show their English titles.
- [ ] **Step 2:** Run `npm run test:e2e`. Expected: FAIL.
- [ ] **Step 3:** Implement the pages and components.
- [ ] **Step 4:** Run `npm run test:e2e && npm test && npm run test:integration && npm run typecheck && npm run lint && npm run build`. Expected: all PASS.
- [ ] **Step 5:** Commit: `feat(gadgetsite): storefront pages from the database`.

### Task 7: CI e2e job and docs

**Files:**

- Modify: `../.github/workflows/gadgetsite.yml`, `README.md`

- [ ] **Step 1:** In the workflow, after the build, add `npm run db:migrate`, `npm run seed`, `npx playwright install --with-deps chromium` and `npm run test:e2e` (with `CI=1`). Upload `playwright-report/` as an artifact when it fails.
- [ ] **Step 2:** Update the README: e2e instructions (`PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium-*/chrome-linux/chrome` locally when no browser is downloaded), the route list, and mark Stage 2 done.
- [ ] **Step 3:** Run the full local suite (unit, integration, e2e, typecheck, lint, build). Expected: all green.
- [ ] **Step 4:** Commit: `ci(gadgetsite): run storefront e2e`. Then push.
