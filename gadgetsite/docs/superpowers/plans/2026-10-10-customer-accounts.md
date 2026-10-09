# gadgetsite — Customer Login and Signup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Customers can sign up and log in with phone + password today, and with phone + SMS code once an SMS gateway is configured. They can see their account page, change their password and log out.

**Architecture:**
- **Shared auth primitives:** `lib/auth/` holds the password hash, session tokens and OTP. They are reused by the Stage 3 admin.
- **Rate limits:** a Redis rate limiter in `lib/server/rate-limit.ts`, failing closed.
- **SMS:** behind `SmsProvider` in `lib/integrations/sms/`.
- **Writes:** server actions with Zod validation.
- **Sessions:** an opaque token in the `gs_customer` cookie; only its SHA-256 hash is stored, in `customer_sessions`.

**Spec:** `gadgetsite/docs/superpowers/specs/2026-10-09-gadgetsite-design.md` §6.2 (phone OTP), §7 (SMS), §9 (customer account), §10 (security). The owner chose **both** methods (2026-10-10).

## Global Constraints

- **Phone:** Bangladeshi mobile only, `BD_MOBILE` (`01[3-9]` + 8 digits). Input is normalised first: spaces and dashes are stripped, and a leading `+880`/`880` becomes `0`.
- **Password:** customer passwords are ≥ 8 characters, argon2id via `@node-rs/argon2`.
- **Login errors:** a wrong password and an unknown phone show the same message and do the same work.
- **OTP code:**
  - 6 digits from `crypto.randomInt`.
  - Stored as `sha256(SESSION_SECRET|phone|code)`, valid 5 min, 5 tries.
  - A new code replaces the old ones for that phone.
- **OTP abuse limits:**
  - requests: 3 per 10 min per phone, 10 per hour per IP
  - verifies: 10 per 10 min per phone
  - password logins: 5 per 15 min per phone, 20 per 15 min per IP
- **Rate-limit store:** Redis, failing closed — when Redis is unreachable the action returns `unavailable`.
- **SMS gateway:** `SMS_PROVIDER` unset means SMS login is hidden and its actions return `disabled`.
  - `SMS_PROVIDER=console` logs the code, and appends `{phone, code}` to `SMS_CONSOLE_FILE` when that is set. For development and tests only, and the README says never to use it in production.
  - A real gateway adapter is added when the owner chooses one.
- **Account protection:** the first successful OTP on an account whose phone isn't verified yet sets `phoneVerifiedAt`, clears `passwordHash` and revokes every session. This stops someone who registered a stranger's number from keeping access.
- **Session:** the `gs_customer` cookie is httpOnly, `SameSite=Lax`, `Secure` in production, path `/`, with a 30-day absolute lifetime. Sessions are revoked on password change and on logout. `readCustomer()` returns null when `passwordChangedAt > session.createdAt`.
- **Strings:** all strings are in `messages/{en,bn}.json` under `account.*`.

## Review Focus

1. **Unknown phone and wrong password** give the same error. Pinned in Task 3.
2. **Takeover via password signup of someone else's phone:** the first OTP verification wipes the password and sessions. Pinned in Task 3.
3. **An expired or used OTP code**, and the 6th wrong attempt, are refused. Pinned in Task 2.
4. **Redis down:** login and OTP refuse with `unavailable`, never skip the limit. Pinned in Task 1.
5. **A signed-in page after logout or a password change elsewhere** redirects to login. Pinned in Tasks 3 and 4.

---

### Task 1: Shared primitives

- **Create:**
  - `lib/redis.ts`: an `ioredis@^5` singleton, `maxRetriesPerRequest: 1`, `enableOfflineQueue: false`, `lazyConnect`.
  - `lib/server/rate-limit.ts`: `hit(key, limit, windowS)` → `{allowed, retryAfterS}`, and `class RateLimitUnavailable`.
  - `lib/auth/password.ts`: `hashPassword`, `verifyPassword`, `DUMMY_HASH`.
  - `lib/auth/token.ts`: `newToken()` (32 random bytes, base64url) and `sha256(s)`.
  - `lib/domain/phone.ts`: `normalizePhone(input): string | null`.
- **Tests:**
  - **Unit:** `normalizePhone('+880 1712-345678')` → `'01712345678'`; `normalizePhone('12345')` → `null`. A password hash round-trips, and the hash starts with `$argon2id$`.
  - **Integration (real Redis):**
    - 3 allowed, then the 4th refused with `retryAfterS > 0`.
    - A closed-port Redis → `RateLimitUnavailable`.
- **Commit:** `feat(gadgetsite): redis rate limiter, password hashing and phone normalisation`.

### Task 2: OTP and SMS

- **Create:**
  - `lib/integrations/sms/{index,console}.ts`: `SmsProvider { send(phone, text): Promise<void> }` and `getSms(): SmsProvider | null`.
  - `lib/auth/otp.ts`:
    - `requestOtp(phone, ip)` → `{ok:true} | {error:'disabled'|'rate_limited'|'unavailable'}`
    - `verifyOtp(phone, code)` → `{ok:true} | {error:'invalid'|'expired'|'rate_limited'|'unavailable'}`

  The SMS text is bilingual: `gadgetsite code: 123456 (5 min)`, with the site name from settings.
- **Tests (integration):**
  - Request then verify with the code from the console file → ok.
  - Verifying again with the same code → `invalid` (single use).
  - Wrong code ×5, then the right code → refused.
  - Mocked time +6 min → `expired`.
  - With `SMS_PROVIDER` unset → `disabled`.
  - The 4th request in 10 min → `rate_limited`.
- **Commit:** `feat(gadgetsite): one-time SMS codes behind an SMS provider`.

### Task 3: Customer auth service

- **Schema:**
  - `Customer` gains `passwordHash String?`, `phoneVerifiedAt DateTime?` and `passwordChangedAt DateTime @default(now())`.
  - New `CustomerSession(id, tokenHash @unique, customerId → Customer cascade, expiresAt, createdAt, ip?, userAgent?)`.
  - Migration `customer_accounts`.
- **Create `lib/auth/customer.ts`:**
  - `signUp({name, phone, password}, ip)` → `{sessionToken} | {fieldErrors} | {error:'phone_taken'|'rate_limited'|'unavailable'}`.
    - `phone_taken` when an account with a password, or a verified phone, already exists.
    - A bare customer row with neither (from a future guest checkout) gets the password.
  - `loginPassword(phone, password, ip)` → `{sessionToken} | {error:'invalid'|'rate_limited'|'unavailable'}`.
  - `loginOtp(phone, code, ip)` creates the customer if none exists and applies the account-protection rule.
  - `readCustomer(token)`, `logout(token)`.
  - `changePassword(customerId, current, next)`: when no password is set, `current` is not required. It revokes all sessions and returns a fresh token.
- **Tests (integration):**
  - Signup, then login → session, and `readCustomer` gives the name.
  - A duplicate signup → `phone_taken`.
  - Unknown phone and wrong password → both `invalid`.
  - Password login rate limit.
  - An OTP login on an unverified password account → `passwordHash` null, old sessions gone.
  - `changePassword` revokes the other sessions.
  - An expired session → null.
- **Commit:** `feat(gadgetsite): customer signup, password and SMS login, sessions`.

### Task 4: Pages, header and e2e

- **Create:**
  - `app/(store)/account/login/page.tsx` with password and SMS-code tabs (the SMS tab only when `getSms()` is set).
  - `app/(store)/account/signup/page.tsx`
  - `app/(store)/account/page.tsx`: profile, change password, own orders list (real query; empty state), logout. It redirects to login when signed out.
  - `app/(store)/account/actions.ts`
  - `components/account/*`
- **Header:** the account icon goes to `/account` and shows the customer's first name when signed in. The layout reads the session server-side.
- Moving the storefront into `app/(store)` (Stage 3 Task 1) happens first here, so account pages share the store layout.
- **e2e `tests/e2e/account.spec.ts`:**
  - Signup → `/account` shows the name, and the header shows the first name.
  - Logout → `/account` redirects to login.
  - Wrong password → error message.
  - Correct password → `/account`.
  - SMS tab (e2e sets `SMS_PROVIDER=console` and `SMS_CONSOLE_FILE`): request a code, read it from the file, verify → `/account`.
  - Bangla labels render.
  - No sideways scroll at 375 px.
- **CI and README:** Redis is already a CI service. Add `SESSION_SECRET`, `SMS_PROVIDER=console` and `SMS_CONSOLE_FILE` to the e2e job env. Document the SMS gateway choice as required before go-live.
- **Commit:** `feat(gadgetsite): customer login, signup and account pages`.

### Task 5: Visual tour

- `scripts/screenshots.mjs` (dev tool, run against a running server): every storefront route, the account pages, the mega menu, EXPLORE ALL, the cart drawer and a variant state, at 1536 px and 375 px, plus Bangla home and account. The PNGs go to `docs/screenshots/`.
- **Commit:** `docs(gadgetsite): screenshots of every page`.
