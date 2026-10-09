# gadgetsite Stage 3 — Admin Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working `/admin` panel where staff sign in with a password and TOTP 2FA and see only what their role allows. From there they edit:

- site settings, theme, motion and delivery
- categories, brands, badges and care plans
- products and variants (including bulk price/stock edits)
- image uploads, staff users and roles

They can also read the audit log. Every write is validated with Zod, sanitised where it is HTML, written in one transaction with its `audit_logs` row, and shows on the storefront at once through `revalidateTag`.

**Architecture:**

- **Routes:** the storefront moves into the `app/(store)` route group with its own layout. `app/layout.tsx` becomes a bare `<html>`/`<body>`. The admin lives in `app/admin` with its own layout and no storefront chrome.
- **Writes:** server actions in `lib/admin/actions/*` (Next.js server actions are POST-only and check the Origin header). Each one calls `requireAdmin(permission)` and then `audited(...)`.
- **Sessions:** an opaque random token in an httpOnly cookie. Only its SHA-256 hash is stored, in `admin_sessions`.
- **Security primitives:** login and TOTP attempts are rate-limited in Redis. TOTP secrets are AES-256-GCM encrypted with `CREDENTIALS_KEY`.

**Tech Stack:** the Stage 1–2 stack, plus `@node-rs/argon2`, `otplib@^12`, `qrcode`, `sanitize-html`, `sharp`, `ioredis@^5` and Redis 7.

**Spec:** `gadgetsite/docs/superpowers/specs/2026-10-09-gadgetsite-design.md` (§8 Admin, §10 Security, §4 Audit). Earlier plans: Stage 1, Stage 2.

## Global Constraints

- All Stage 1–2 constraints hold: whole-taka `Int`; computed discount, EMI and stock; bn/en; no hard-coded shopper text; Prettier style; standalone project.
- **Bilingual admin:** admin UI strings live in `messages/{en,bn}.json` under `admin.*`. Every bilingual field shows both an `En` and a `Bn` input; `Bn` is optional.
- **Write path:** every admin write goes through `audited(actor, action, entity, entityId, fn)`, which runs `fn` in a transaction and writes `before`/`after` to `audit_logs` in that transaction. After commit the action calls `revalidateTag` for the affected tags from `lib/server/cached.ts` `TAGS`.
- **Validation:** every action validates with Zod first. Slugs must match `SLUG` (Stage 2). Money is a non-negative integer, and `offerPrice <= regularPrice`.
- **HTML:** rich HTML (product descriptions) is sanitised with `sanitizeRichText()` before it is stored. Allowed: `p, br, strong, em, ul, ol, li, h2, h3, a[href|title], table, thead, tbody, tr, th, td`. `href` must be `http`, `https`, `mailto`, `tel` or relative. Everything else is dropped.
- **Passwords:** argon2id, minimum 12 characters. Every admin needs a confirmed TOTP before reaching any panel page.
- **Sessions:**
  - Cookie `gs_admin` (httpOnly, `SameSite=Lax`, `Secure` in production, path `/admin`), 12 h absolute lifetime.
  - Rotated on login. Deleted on logout.
  - Every session is deleted when the user's password, roles, TOTP or `active` flag change.
- **Rate limits** (Redis, fixed window), failing **closed** — if Redis is down, sign-in is refused with a clear error:
  - login: 5 per 15 min per email and 20 per 15 min per IP
  - TOTP: 5 per 5 min per pending session
- **Uploads:** JPEG, PNG or WebP only, ≤ 5 MB. Re-encoded with sharp to WebP (max 2000 px wide), which strips metadata. Stored through `StorageDriver` (`local` writes to `public/uploads/` in dev). There is no S3 driver until hosting is chosen (spec §14).
- **Not in this stage** (they arrive in Stage 4): the home builder, banners, menus, ticker, pages/blog, promotions, EMI tables, CSV import/export, a WYSIWYG editor (descriptions are an HTML textarea with a live sanitised preview), pre-order requests.

## Review Focus

1. **A user without a permission** who opens the URL or posts the server action directly gets 403 and nothing changes. Pinned in Task 4 (integration), Task 7 and Task 8 (e2e).
2. **A disabled user, or a user whose password was changed elsewhere,** is signed out on their next request. Pinned in Task 3.
3. **A description with `<script>`, `onerror=` or `javascript:` links** is stored and rendered without them. Pinned in Task 2 (unit) and Task 7 (e2e on the storefront).
4. **Concurrent or partial writes:**
   - A failed variant save must not leave the product half-updated, and must not write an audit row for a change that rolled back.
   - Deleting a category that still has products is refused with a message, not a 500.

   Pinned in Tasks 6 and 7.

5. **The last owner** can't remove their own owner role or deactivate themselves (no lock-out). Pinned in Task 8.

---

### Task 1: Split the storefront and admin layouts

**Files:**

- Move: every storefront route under `app/` (except `api/`, `icon.svg`, `globals.css`) → `app/(store)/`.
- Create: `app/(store)/layout.tsx`, which takes over the current `app/layout.tsx` body: chrome, providers and `dynamic = 'force-dynamic'`.
- Modify: `app/layout.tsx`. It keeps fonts, `globals.css`, the theme `<style>` and `NO_FLASH`, plus `<html lang>` / `<body>` and `NextIntlClientProvider`.
- Move: `app/not-found.tsx` → `app/(store)/not-found.tsx`. Keep a root `app/not-found.tsx` that renders the storefront 404 inside the store layout through a `(store)` catch-all: `app/(store)/[...missing]/page.tsx` calls `notFound()`.

- [ ] **Step 1:** Run `npm run test:e2e`. Expected: 26 passed. This is the baseline that must stay green.
- [ ] **Step 2:** Do the move and the split.
- [ ] **Step 3:** Run `npm run test:e2e && npm run typecheck && npm run build`. Expected: 26 passed, and the build lists the same routes.
- [ ] **Step 4:** Commit: `refactor(gadgetsite): storefront route group with its own layout`.

### Task 2: Security primitives

**Files:**

- Create:
  - `lib/crypto.ts`
  - `lib/redis.ts`
  - `lib/server/rate-limit.ts`
  - `lib/admin/password.ts`
  - `lib/admin/totp.ts`
  - `lib/admin/sanitize.ts`
- Test:
  - `tests/unit/crypto.test.ts`
  - `tests/unit/password.test.ts`
  - `tests/unit/totp.test.ts`
  - `tests/unit/sanitize.test.ts`
  - `tests/integration/rate-limit.test.ts`
- Modify: `.env.example` (add `CREDENTIALS_KEY`, a 64-hex-character key, and `SESSION_SECRET`), `docker-compose.yml` (redis is already there), `vitest.config.ts` (the integration env also gets `REDIS_URL`).

**Interfaces:**

- **`lib/crypto.ts`:**
  - `encrypt(plain: string): Buffer` and `decrypt(blob: Buffer): string`.
  - AES-256-GCM. The blob is `iv(12) | tag(16) | ciphertext`.
  - The key comes from `process.env.CREDENTIALS_KEY` (hex, 32 bytes). It throws `Error('CREDENTIALS_KEY must be 64 hex chars')` otherwise.
- **`lib/admin/password.ts`:**
  - `hashPassword(p: string): Promise<string>`: argon2id, `memoryCost 19456, timeCost 2`.
  - `verifyPassword(hash: string, p: string): Promise<boolean>`.
  - `PASSWORD_MIN = 12`.
- **`lib/admin/totp.ts`:**
  - `newTotpSecret(): string` (base32).
  - `totpUri(secret, email, issuer)`.
  - `verifyTotp(secret, token): boolean`: 30 s step, ±1 window.
  - `totpQrDataUrl(uri): Promise<string>`.
- **`lib/admin/sanitize.ts`:** `sanitizeRichText(html: string): string`, using the allow-list in Global Constraints.
- **`lib/redis.ts`:** `redis()` returns a lazily created `ioredis` singleton from `REDIS_URL`, with `maxRetriesPerRequest: 1` and `enableOfflineQueue: false`.
- **`lib/server/rate-limit.ts`:**
  - `class RateLimitUnavailable extends Error`.
  - `hit(key: string, limit: number, windowS: number): Promise<{ allowed: boolean; remaining: number; retryAfterS: number }>`.
  - It uses `INCR` and, on the first hit, `EXPIRE`. Any Redis error throws `RateLimitUnavailable`; this is the fail-closed rule.

- [ ] **Step 1:** Write the tests:
  - **crypto:**
    - Encrypting then decrypting gives back the input, including Bangla text.
    - Two encryptions of the same input differ.
    - A tampered byte throws.
    - A bad key throws the message above.
  - **password:**
    - Verifying a hash against its own password → true; against another password → false.
    - The hash starts with `$argon2id$`.
  - **totp:**
    - `verifyTotp(secret, authenticator.generate(secret))` → true.
    - The token from 3 steps earlier → false (with mocked time via `vi.setSystemTime`).
    - `totpUri` contains `issuer=` and the email.
  - **sanitize:**
    - `<p onclick="x">a</p><script>alert(1)</script>` → `<p>a</p>`
    - `<a href="javascript:alert(1)">x</a>` → `<a>x</a>`
    - `<img src=x onerror=alert(1)>` → `''`
    - `<h2>T</h2><ul><li>1</li></ul>` is unchanged.
  - **rate-limit (integration, real Redis):**
    - With limit 3: 3 hits are allowed and the 4th is not, with `retryAfterS > 0`.
    - A distinct key is unaffected.
    - With `REDIS_URL` pointing at a closed port, `hit` rejects with `RateLimitUnavailable`.
- [ ] **Step 2:** Start Redis (`redis-server --daemonize yes` locally; it is a service in CI). Run `npm test && npm run test:integration`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Install `@node-rs/argon2 otplib@^12 qrcode sanitize-html ioredis@^5` and dev `@types/qrcode @types/sanitize-html`. Implement the modules.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(gadgetsite): crypto, password, TOTP, sanitiser and rate limiter`.

### Task 3: Admin authentication

**Files:**

- Modify: `prisma/schema.prisma`.
  - Add `AdminSession(id, tokenHash String @unique, userId, expiresAt, ip?, userAgent?, createdAt)`, cascading from `AdminUser`.
  - Add `AdminUser.totpConfirmedAt DateTime?` and `AdminUser.passwordChangedAt DateTime @default(now())`.
  - Create the migration `admin_sessions`.
- Create:
  - `lib/admin/session.ts`
  - `lib/admin/auth.ts`
  - `app/admin/login/page.tsx`, `app/admin/login/actions.ts`
  - `app/admin/login/LoginForm.tsx` (client: password step → TOTP step or enrolment step with the QR code)
  - `app/admin/logout/route.ts` (POST)
  - `middleware.ts` (matcher `/admin/:path*`; redirects to `/admin/login` when the `gs_admin` cookie is missing, except on `/admin/login`)
  - `scripts/admin-create.ts`
- Modify: `package.json` (script `admin:create`: `tsx scripts/admin-create.ts`).
- Test: `tests/integration/admin-auth.test.ts`; e2e in Task 9.

**Interfaces:**

- **`lib/admin/session.ts`:**
  - `createSession(userId, meta: {ip?, userAgent?}): Promise<string>`: returns the raw token. It stores `sha256(token)` with `expiresAt = now + 12h`.
  - `readSession(token): Promise<{ user: AdminUser; permissions: Set<string> } | null>`. It returns null when the session is expired, the user is inactive, `totpConfirmedAt` is null, or `passwordChangedAt > session.createdAt`.
  - `revokeSessions(userId): Promise<void>`.
  - `SESSION_COOKIE = 'gs_admin'`.
- **`lib/admin/auth.ts`:** the step state machine for login.
  - `startLogin(email, password, ip)` → `{ step: 'totp' | 'enrol'; pendingToken; enrol?: { secret; qr } } | { error: 'invalid' | 'rate_limited' | 'unavailable' }`.
    - Rate limits: `login:email:<lowercased email>` (5/900 s) and `login:ip:<ip>` (20/900 s).
    - A wrong password and an unknown email both return `invalid`, with the same work done (always run `verifyPassword` against a dummy hash).
    - `pendingToken` is HMAC-SHA256-signed with `SESSION_SECRET` over `userId|exp` (5 min).
  - `finishLogin(pendingToken, totp, ip, meta)` → `{ sessionToken } | { error: 'invalid' | 'expired' | 'rate_limited' | 'unavailable' }`.
    - Rate limit: `totp:<userId>` (5/300 s).
    - On first enrolment it stores the encrypted secret and sets `totpConfirmedAt`.
    - The enrolment secret travels encrypted inside the pending token (not in the database) until it is confirmed.
- **Server actions** in `app/admin/login/actions.ts` wrap those functions, read the IP from `x-forwarded-for` (first entry) or `127.0.0.1`, and set the cookie.
- **`admin-create`:** `npm run admin:create -- --email a@b.c --role owner` reads the password from the `ADMIN_PASSWORD` env var or prompts with hidden input, refuses passwords under 12 characters, and upserts the user with the given role.

- [ ] **Step 1:** Write `tests/integration/admin-auth.test.ts` (real DB and Redis; flush the `login:*` and `totp:*` keys in `beforeEach`):
  - A seeded user with a known password goes through `startLogin` (`step: 'enrol'`) and then `finishLogin` with `authenticator.generate(enrol.secret)`, which returns a sessionToken. `readSession` then returns the user and the owner permissions.
  - A wrong password gives `{error:'invalid'}`; an unknown email gives `{error:'invalid'}`.
  - The 6th attempt for the same email within the window gives `rate_limited`.
  - A tampered pendingToken, or one past its 5 minutes (with mocked time), gives `expired`/`invalid`.
  - A wrong TOTP gives `invalid`, and the 6th one gives `rate_limited`.
  - After `admin.active = false`, `readSession` → null. After updating `passwordChangedAt` to now, `readSession` → null.
  - An expired session → null.
  - `revokeSessions` deletes all of the user's sessions.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement the schema and migration, the libraries, the pages, the middleware and the script.
- [ ] **Step 4:** Run `npm run test:integration && npm run typecheck && npm run build`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(gadgetsite): admin sign-in with password and TOTP 2FA`.

### Task 4: Authorisation, audit and the admin shell

**Files:**

- Create:
  - `lib/admin/guard.ts`
  - `lib/admin/audit.ts`
  - `lib/admin/action.ts` (the action wrapper)
  - `app/admin/(panel)/layout.tsx`
  - `app/admin/(panel)/page.tsx` (dashboard)
  - `app/admin/(panel)/forbidden/page.tsx`
  - `components/admin/{Nav,Field,BilingualField,Submit,Flash,Table}.tsx`
- Modify: `messages/{en,bn}.json` (`admin.*`), `next.config.mjs`. Add `headers()` for `/admin/:path*`: `X-Frame-Options: DENY`, `Referrer-Policy: same-origin`, `Cache-Control: no-store`.
- Test: `tests/integration/admin-guard.test.ts`.

**Interfaces:**

- **`lib/admin/guard.ts`:**
  - `currentAdmin(): Promise<{ user; permissions } | null>`: reads the cookie and calls `readSession`.
  - `requireAdmin(permission?: PermissionCode)`: with no session, `redirect('/admin/login')`. With a session that lacks the permission, it throws `Forbidden` (in pages, `redirect('/admin/forbidden')`).
  - `type PermissionCode` is re-exported from `prisma/seed-data/defaults.ts` `permissions`.
- **`lib/admin/audit.ts`:** `audited<T>(actorId: string, action: 'create'|'update'|'delete', entity: string, entityId: string | ((r:T)=>string), fn: (tx) => Promise<{ before: unknown; after: unknown; result: T }>, ip?: string): Promise<T>`.
  - It runs `fn` and the `auditLog.create` in one `db.$transaction`.
  - When `before` and `after` are deep-equal it writes no audit row.
- **`lib/admin/action.ts`:** `adminAction<S extends z.ZodType, R>(permission, schema: S, tags: (keyof typeof TAGS)[], handler: (input: z.infer<S>, ctx: {actorId, ip}) => Promise<R>)` produces a server action `(prev, formData) => Promise<ActionState<R>>`.
  - It parses `formData` with `schema` (via `formDataToObject`, which supports `name[]` arrays and `name.en`/`name.bn` nesting).
  - It returns `{ ok:false, fieldErrors }` on a validation error and `{ ok:false, error:'forbidden' }` without the permission.
  - It catches Prisma `P2002` as `{ ok:false, fieldErrors:{ slug:['taken'] } }` and `P2003` as `{ ok:false, error:'in_use' }`.
  - After success it calls `revalidateTag` for each tag.
- **Layout:** a sidebar from `NAV` (label key, href, permission). Items the user lacks are hidden. A header shows the user's email, the sign-out form and the language toggle.
- **Dashboard:** counts of active products, out-of-stock variants, pre-order requests (new) and the last 10 audit entries.

- [ ] **Step 1:** Write `tests/integration/admin-guard.test.ts`, with `next/headers` cookies and `next/navigation` redirect mocked:
  - `requireAdmin('catalog.write')` with a `support` user throws `Forbidden`.
  - With no cookie it calls redirect with `/admin/login`.
  - `audited` writes exactly one audit row containing before/after on success.
  - When `fn` throws after a DB write inside the transaction, neither the write nor the audit row persists.
  - A no-op update writes no audit row.
  - `adminAction` with invalid form data returns fieldErrors and writes nothing. For a user without the permission it returns `forbidden` and the handler never runs.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run test:integration && npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(gadgetsite): admin guard, audited writes and panel shell`.

### Task 5: Settings

**Files:**

- Create: `app/admin/(panel)/settings/page.tsx`, `lib/admin/actions/settings.ts`
- Test: extend `tests/integration/admin-actions.test.ts` (new file)

**Behaviour:**

- **Forms:**
  - site: `nameEn`, `nameBn`, `phone` (BD format or empty), and the logo (upload via Task 7's `StorageDriver`; until then a URL field that only accepts `/uploads/...` or `https://...`)
  - theme: 11 colour inputs, each validated by `ThemeSettings`
  - motion: 6 number inputs, validated by `MotionSettings`, plus a "reset to defaults" button
  - delivery: `freeOver`
- **Permission:** `settings.write`. **Tags:** `settings`.
- Each section is its own form and action (`saveSite`, `saveTheme`, `saveMotion`, `saveDelivery`), and each is audited with entity `setting:<key>`.

- [ ] **Step 1:** Tests:
  - `saveSite` with a valid body updates the row, writes 1 audit row and calls `revalidateTag('settings')` (mocked).
  - `saveTheme` with `sand: 'red'` → fieldErrors and no change.
  - `saveMotion` with `heroCycleMs: 0` → fieldErrors.
- [ ] **Step 2:** FAIL → implement → PASS.
- [ ] **Step 3:** Commit: `feat(gadgetsite): admin settings`.

### Task 6: Categories, brands, badges and care plans

**Files:**

- Create: `app/admin/(panel)/{categories,brands,badges,care-plans}/page.tsx` (list + inline create) and `.../[id]/page.tsx` (edit), `lib/admin/actions/catalog-meta.ts`, `components/admin/EntityForm.tsx`
- Test: `tests/integration/admin-actions.test.ts`

**Behaviour:**

- **Fields:**
  - **Category:** `slug`, `nameEn`, `nameBn`, `parentId` (a select that excludes itself and its descendants), `sort`, `active`.
  - **Brand:** `slug`, `nameEn`, `nameBn`, `logoUrl` (upload), `sort`, `active`.
  - **Badge:** `code`, `labelEn`, `labelBn`, `color` (hex).
  - **Care plan:** `nameEn`, `nameBn`, `price`, `coverageMonths` (1–60), `descriptionEn`, `descriptionBn`.
- **Delete:**
  - A category or brand with products is refused with `error: 'in_use'` and a message showing the product count; checked before deleting, with P2003 as a backstop.
  - Deleting a badge removes its product links.
- **Permission:** `catalog.write` (lists need `catalog.read`). **Tags:** `catalog`, plus `content` for categories and brands (mega menus and Explore All).
- Setting a parent that would create a cycle → fieldError `parentId: ['cycle']`.

- [ ] **Step 1:** Tests:
  - Create a category, then a duplicate slug → `fieldErrors.slug`.
  - Deleting `phones` → `in_use`, and it still exists.
  - Making `phones` its own grandchild's child → `cycle`.
  - Brand create/update/delete each write an audit row.
  - A `support` user calling `saveBrand` → `forbidden`.
- [ ] **Step 2:** FAIL → implement → PASS.
- [ ] **Step 3:** Commit: `feat(gadgetsite): admin categories, brands, badges and care plans`.

### Task 7: Products, variants and uploads

**Files:**

- Create:
  - `lib/storage/index.ts`, `lib/storage/local.ts`
  - `app/admin/(panel)/uploads/route.ts` (POST multipart, which returns `{ url }`)
  - `components/admin/ImageUpload.tsx`
  - `app/admin/(panel)/products/page.tsx` (list)
  - `app/admin/(panel)/products/new/page.tsx`, `app/admin/(panel)/products/[id]/page.tsx` (editor)
  - `app/admin/(panel)/products/bulk/page.tsx`
  - `components/admin/ProductEditor.tsx`, `components/admin/VariantRows.tsx`
  - `lib/admin/actions/products.ts`
- Modify: `.gitignore` (`public/uploads/`).
- Test: `tests/integration/admin-products.test.ts`, `tests/unit/storage.test.ts`

**Interfaces and behaviour:**

- **Storage:**
  - `StorageDriver { put(key: string, bytes: Buffer, contentType: string): Promise<string /* public URL */> }`. `getStorage()` picks by `STORAGE_DRIVER` (default `local`).
  - `processImage(bytes: Buffer): Promise<Buffer>`: sharp → rotate → resize to max 2000 px wide (no enlargement) → WebP at quality 82. It throws `InvalidImage` when sharp can't read the input, or when the detected format isn't jpeg/png/webp.
- **Upload route:** `catalog.write`, Origin check (`isSameOrigin`), ≤ 5 MB, key `uploads/<yyyy>/<mm>/<random>.webp`.
- **List:**
  - Search by title or SKU.
  - Filter by status, category and brand. Paginate 50 per page.
  - Columns: computed price range, total stock, and stock status.
- **Editor:**
  - **Product fields:** `slug`, `titleEn`/`Bn`, `brandId`, `categoryId`, `status`, `preorder`, `bookingAmount` (required when `preorder`, and ≤ the lowest offer price), `lowStockThreshold`, `warrantyEn`/`Bn`, `descriptionHtmlEn`/`Bn` (a textarea plus a live preview of `sanitizeRichText` output), badges (checkboxes), care plans (checkboxes).
  - **Variant rows** (add/remove): `sku`, `color`, `storage`, `ram`, `region`, `offerPrice`, `regularPrice`, `stock`, `images` (uploads, reorderable). At least 1 variant.
  - **One save** writes the product and the full variant set in one `audited` transaction.
    - It upserts by id, creates new rows and deletes removed rows.
    - A removed variant that has order items is refused with a fieldError; Stage 5 adds orders, and the check uses `orderItems` count.
  - The editor shows computed discount and stock status (read-only) next to each variant.
- **Bulk:** a table of every variant (filter by category or brand) with editable `offerPrice`, `regularPrice` and `stock`. On save, only changed rows are written: one transaction, one audit row per changed variant.
- **Permission:** `catalog.write`. **Tags:** `catalog`.

- [ ] **Step 1:** Tests:
  - **storage unit:** `processImage` on a generated 3000×100 PNG gives WebP 2000 px wide. Text bytes → `InvalidImage`. An SVG → `InvalidImage`.
  - **products integration:**
    - Saving a new product with 2 variants creates 1 product, 2 variants and 1 audit row.
    - A save whose second variant has `offerPrice > regularPrice` → fieldErrors, and the first variant has NOT changed (all-or-nothing).
    - Removing a variant deletes it.
    - A description `<p>ok</p><script>x</script>` is stored as `<p>ok</p>`.
    - `preorder` without `bookingAmount` → fieldError.
    - Bulk-saving 3 rows where 1 changed → 1 audit row.
    - `revalidateTag('catalog')` is called.
- [ ] **Step 2:** FAIL → install `sharp` → implement → PASS.
- [ ] **Step 3:** Commit: `feat(gadgetsite): admin products, variants, bulk edit and image uploads`.

### Task 8: Users, roles and audit log

**Files:**

- Create: `app/admin/(panel)/users/page.tsx`, `app/admin/(panel)/users/[id]/page.tsx`, `app/admin/(panel)/roles/page.tsx`, `app/admin/(panel)/audit/page.tsx`, `lib/admin/actions/users.ts`
- Test: `tests/integration/admin-users.test.ts`

**Behaviour:**

- **Users** (`users.manage`):
  - Invite: email + role(s) + an initial password (≥ 12 characters), shown once.
  - Edit: roles, active flag, reset password, and reset 2FA (clears the secret and `totpConfirmedAt`).
  - Every change calls `revokeSessions(userId)`.
  - **Guard:** an action that would leave zero active owners is refused with `error: 'last_owner'`. That covers removing the owner role, deactivating, or deleting the last owner.
- **Roles** (`users.manage`): a matrix of roles × permissions with checkboxes. `owner` always has every permission and is shown read-only.
- **Audit log** (`audit.read`): newest first, filter by entity, actor and date range, 50 per page, with an expandable before/after JSON diff.

- [ ] **Step 1:** Tests:
  - Removing owner from the only owner → `last_owner`, and the role is kept.
  - Deactivating the only owner → `last_owner`.
  - With 2 owners, removing one works and that user's sessions are revoked.
  - Resetting 2FA nulls `totpConfirmedAt`, so `readSession` for the user's existing session → null.
  - Updating the role matrix writes an audit row.
- [ ] **Step 2:** FAIL → implement → PASS.
- [ ] **Step 3:** Commit: `feat(gadgetsite): admin users, roles and audit log`.

### Task 9: Admin e2e, CI and docs

**Files:**

- Create: `tests/e2e/admin.spec.ts`
- Modify: `tests/e2e/prepare.ts`.
  - Create an owner `owner@e2e.test` and a `support@e2e.test` user with known passwords and confirmed TOTP secrets.
  - Write those secrets to the e2e marker directory, so specs can generate codes with `authenticator.generate`.
- Modify: `../.github/workflows/gadgetsite.yml` (add `CREDENTIALS_KEY` and `SESSION_SECRET` test values in the job env), `README.md` (admin setup: `npm run admin:create`, 2FA, roles; mark Stage 3 done).

- [ ] **Step 1:** Write `tests/e2e/admin.spec.ts` (Stage 2 fixtures; allow 404 console noise only where specified):
  - `/admin` without a session redirects to `/admin/login`.
  - The owner signs in (password, then a TOTP from the stored secret) and lands on the dashboard.
  - Owner flow:
    - Edit `iphone-16-pro`'s first variant offer price to 155000 and save.
    - `/products/iphone-16-pro` shows `৳1,55,000` within the same test (cache revalidated).
    - `/admin/audit` lists `variant` / `update`.
  - The owner changes the site name to "E2E Store" and the storefront header shows it.
  - A description containing `<script>window.__x=1</script><p>Safe</p>` is saved. The storefront page shows "Safe", and `window.__x` is undefined.
  - Support flow:
    - The Products editor link is absent.
    - Opening `/admin/products/new` directly redirects to `/admin/forbidden`.
  - An admin page response has the `X-Frame-Options: DENY` header.
- [ ] **Step 2:** Run `npm run test:e2e`. Expected: the new specs FAIL until the earlier tasks are wired end to end (if they already pass, check each one fails when its feature is reverted, then move on).
- [ ] **Step 3:** Fix whatever the e2e run exposes. Update CI and the README.
- [ ] **Step 4:** Run the full suite (unit, integration, e2e, typecheck, lint, build). Expected: all green.
- [ ] **Step 5:** Commit: `test(gadgetsite): admin e2e; ci and docs`. Then push.

---

## Addendum (2026-10-10): owner requests folded into Stage 3

Already done by the customer-accounts plan, so these tasks reuse that code rather than rebuild it:

- **Task 1:** the `(store)` route group.
- **From Task 2:** `lib/crypto.ts`, `lib/auth/password.ts`, `lib/auth/token.ts` and `lib/server/rate-limit.ts`.

Admin passwords use the same `hashPassword` with `PASSWORD_MIN = 12`.

### Task A1: Product sales (in Task 7)

- **Schema:** `Variant` gains `salePrice Int?`, `saleStartsAt DateTime?` and `saleEndsAt DateTime?`.
- **Active sale:** a sale counts when `salePrice` is set, `salePrice < offerPrice`, and `now` falls within `[saleStartsAt ?? -∞, saleEndsAt ?? +∞)`.
- **Computed price:** `lib/domain/pricing.ts` `effectivePrice(v, now)` returns `{ price, onSale, saleEndsAt }`. The storefront shows `price` as the offer price, with discount computed against `regularPrice`, plus a "Sale" badge and its end time.
- **Editor:** the product editor and bulk table edit `salePrice`, start and end. Validation: `salePrice < offerPrice`, and end after start.
- **Tests:**
  - unit: `effectivePrice` before, during and after the window, with no end date, and with a sale price at or above the offer price
  - integration: an active sale changes the `listProducts` price and an expired one doesn't
  - e2e: a sale set in admin shows on the storefront

### Task A2: API and service keys (in Task 5)

- **Screen:** `/admin/settings/services`, with permission `settings.write` for SMS and `payments.config` / `couriers.config` for later providers.
- **SMS form:** provider (`bulksmsbd`), API key, sender ID, enabled, and a "Send test SMS" button that goes to a phone number entered on the form.
- **Write-only keys:** values show masked (`describeCredential`). Leaving a key blank keeps the stored value.
- **Audit:** the `audited` row stores the masked config, never the plain one.
- **Tests:**
  - A save, then `readCredential`, gives the new values.
  - The audit `after` contains `••••`, not the key.
  - A blank key keeps the old one.

### Task A3: Footer management (with Task 6)

- **Settings key `footer`** (Zod `FooterSettings`):
  - `columns: { title: Bilingual; links: MenuItem[] }[]`
  - `branches: { name: Bilingual; address: Bilingual; phone?: string; mapUrl?: string }[]`
  - `socials: { network: 'facebook'|'instagram'|'youtube'|'tiktok'|'linkedin'|'whatsapp'; url }[]`
  - `appLinks: { store: 'google_play'|'app_store'; url }[]`
  - `copyright: Bilingual`
- **Storefront:** the footer is rebuilt to the zip prototype's layout: brand and branches, the link columns, the branch list with "see more", the social icons, the app badge, and the copyright pill. Empty parts are hidden. The seed migrates the existing `footer` menu into one column.
- **Admin:** `/admin/content/footer` edits all of it, with row add/remove/reorder.
- **Tests:**
  - integration: save → `getSettings().footer` round-trips, and a bad URL → fieldError
  - e2e: a column added in admin shows on the storefront footer

### Task A4: Customers (in Task 8)

- **List:** `/admin/customers` (`customers.read`) shows phone, name, created, last login time and IP, verified, order count, plus search.
- **Detail:** sessions (IP, user agent, created) with a "sign out everywhere" button that needs `users.manage`.
- **Test:** the list shows `lastLoginIp` after a login.

### Task A5: Share previews (Open Graph)

- **Product pages:** `generateMetadata` sets `title`, `description` (spec text + price), `openGraph` (`type: 'website'`, `url`, absolute `images` from `APP_URL` + the first variant image, `siteName`) and `twitter: summary_large_image`.
- **Other pages:** category and home pages get title and site name.
- **Default image:** `app/opengraph-image.tsx` renders the site name when a product has no image.
- **Test:** e2e reads `meta[property="og:image"]` on a product page; it is an absolute URL that returns 200 `image/*`.
