# Client accounts

Website side of client sign-in, built 2026-10-30. The Studio owns verified
identity, linking an account to a client record, business permissions and the
upstream contracts; none of that is invented here. Canonical handoff:
`wt-integration-implementation/docs/03-guides/website-studio-integration.md`.

**Status:** the Studio's customer-auth contract is published: **revision 2.1,
API v2, commit `cc738d2`** (`feat/customer-auth-foundation`,
`docs/03-guides/customer-auth-v2.md`). This website work predates it and is
compatible with its cookie, configuration and callback choices, but the
**website v2 adapter is not implemented and no paired authenticated
verification with the Studio has been done.** Everything below is
website-side sign-in only; it is not authenticated Studio integration.

## What clients get

- **Sign up** (`/account/signup`): email and password (8–72 characters). One
  confirmation email. The link signs them in on whatever tab or device opens
  it (Supabase token-hash flow, `/account/confirm`), so no second sign-in
  straight after confirming.
- **Sign in** (`/account/login`): password only, no email code. Unconfirmed
  accounts are told so and can ask for the link again.
- **Forgot / reset** (`/account/forgot`, `/account/reset`). Never says whether
  an email has an account; signing up with a taken email looks identical.
- **Sign out**: this device only; also forgets a quote waiting for sign-in.
- **Account home** (`/account`): email, New request, Sign out, and the
  client's records. The v2 account endpoints (`GET /account`, `/requests`,
  `/requests/:id`) are not wired up yet, so `accountOverview`
  (`src/lib/account/records.ts`) still returns `not_connected` and the page
  says so plainly. No sample or fixture data is ever shown. The display shape
  (quotes to review first, requests, upcoming, completed, payments where
  reported) awaits the adapter.
- **Quote**: questions → review → (create account / sign in) → send. Signed-in
  clients send straight away ("Sending as …"), and the quote's top link
  becomes "My account". `/api/quote` itself requires a verified session
  whenever accounts are on (401 `sign_in_required`); the screen keeps the
  answers and asks them to sign in again.

## How it works

| Concern                 | Implementation                                                                                                                                                                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Library                 | `@supabase/ssr` 0.12.7 and `@supabase/supabase-js` 2.118.0 (pinned), server only. No browser Supabase client and no tokens in JavaScript.                                                                                                                   |
| Identity checks         | `getClaims()` everywhere (`src/lib/account/server.ts`), never `getSession()`.                                                                                                                                                                               |
| Session refresh         | `src/proxy.ts` (Next 16 proxy), only on `/account*`, `/quote` and `/api/quote`, never on the Studio's forwarded paths. Applies Supabase's no-cache headers on refresh and marks the page `private, no-store`.                                               |
| Cookies                 | `cosmos-client-auth` (+ `.N` chunks, PKCE verifier): host-only (no Domain), `HttpOnly`, `SameSite=Lax`, `Secure` except on loopback dev hosts. The name deliberately differs from Supabase's default `sb-<ref>-auth-token`, which cleaners' `/me` uses.     |
| Private responses       | `/account*`: `Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow, noarchive`, `Referrer-Policy: no-referrer` (next.config `headers()`), plus `robots` metadata. `/account/confirm` answers 303 with a relative Location.                   |
| Return-to               | `src/lib/account/destination.ts`: an allowlist of whole paths, `/account`, `/quote`, `/q/<token>`, `/pay/<token>` (16–128 URL-safe chars). Anything else, including every absolute, protocol-relative, backslash, query or `/me` value, becomes `/account`. |
| Studio destinations     | Opened with a full page load (`ContinueTo`, plain `<a>`), never next/link.                                                                                                                                                                                  |
| Answers through sign-in | `src/lib/quote-handoff.ts`: the reviewed draft goes to `localStorage` (so a confirmation opened in a new tab finds it), versioned, 24-hour expiry, cleared on send and on sign-out. Never in a URL. The sign-up page offers the quote's email from it.      |
| Off switch              | Accounts are on only when `AUTH_SUPABASE_URL` and `AUTH_SUPABASE_PUBLISHABLE_KEY` are set. Unset, every account page says accounts aren't open and the quote behaves exactly as before.                                                                     |

Studio intake is unchanged: the website still uses the v1 adapter with
`identity: {status: "pending"}`, and production Studio delivery stays blocked
(`QUOTE_DELIVERY_MODE`). The contract's authenticated path is a separate v2
intake (`{version: 2, submission_id, answers}` with the client's bearer token);
that adapter, and its fail-closed handling when auth configuration or a
session is missing, are not implemented yet. Signing in on the website does
not make a v1 submission authenticated.

## Decided: one Supabase project (2026-10-30)

Production client accounts use the **same authoritative Supabase project as
the Studio** (this supersedes the earlier rule keeping Studio project settings
out of this repository). This repository's own local Supabase stack
(`supabase/config.toml`, API 54621) is an **isolated test setup only**.

Sharing the project grants nothing beyond sign-in:

- The website uses only the project URL and its **publishable** key, server
  side. Never a service-role or secret key.
- Website clients get no direct access to business tables. Customer, cleaner
  and staff permissions stay separate: client JWTs must not satisfy staff
  membership or cleaner-portal policies, and RLS must not treat "any
  authenticated user" as a client of any record.
- Distinct cookie name (`cosmos-client-auth`) so client and cleaner `/me`
  sessions on the company host never overwrite each other.

## Remaining integration requirements (Studio-owned unless noted)

These are **not** done by the website work and block production use.

1. **Verified identity and client linking.** The Studio independently verifies
   the customer's identity (their Supabase JWT, not anything the website
   asserts) and securely links it to the correct client record. An email
   match or a claimed ID is not sufficient (see the canonical guide's
   ownership/deduplication rules).
2. **Ownership on quote and payment pages and actions.** The Studio enforces
   that only the linked client can view or act on `/q/<token>` and
   `/pay/<token>` where an account is required. The website's
   `/account/login?next=…` redirect and its wrong-account screen are
   navigation and wording only; they establish **no** backend protection.
3. **Fail closed in production.** Production Studio delivery must refuse to
   send if authentication configuration is missing. An "accounts off" setting
   (unset `AUTH_SUPABASE_*`) must never let intake through unauthenticated.
   Today production Studio delivery is blocked outright (`studio_pending`);
   when it is enabled, it must require both auth configuration and a verified
   session, and the Studio must reject unauthenticated envelopes itself.
   (The legacy-inbox mode's accounts-off behaviour must not carry over.)
4. **Server-side auth rate limiting needs a reviewed deployment design.**
   Every Supabase Auth call comes from the website server, so provider per-IP
   limits are shared by all clients. Raising provider limits is not enough on
   its own. The design must cover per-client limits on sign-in, sign-up,
   resend and reset (e.g. Vercel WAF rules on `/account/*` Server Action
   POSTs), whether and how the real client IP reaches Supabase, and which
   forwarded-IP headers are trusted. The browser tests set `VERCEL=1` only
   so each test gets its own quote-limiter bucket; that proves nothing about
   production forwarded-IP handling.

## Studio contract (published after this work)

The Studio published **customer-auth v2, revision 2.1** (`cc738d2`,
`wt-integration-implementation/docs/03-guides/customer-auth-v2.md`). It adopts
this website's cookie name, `AUTH_SUPABASE_*` variables and `/account/confirm`
flow. Studio sends signed-out clients to `/account/login?next=…` but never
sends `reason=wrong_account` (another owner's link reads as not found), so the
website's wrong-account screen stays a generic switch-account action. Adapter
work (intake v2, account data, fail-closed, account-bound drafts, email
change) has **not started**; the gaps are listed in
[commit-inventory-2026-10-30.md](commit-inventory-2026-10-30.md).

## Configuration needed (names only; no values here)

- Website env: `AUTH_SUPABASE_URL` (HTTPS, the Studio's project),
  `AUTH_SUPABASE_PUBLISHABLE_KEY` (publishable only).
  Server only. `NEXT_PUBLIC_SITE_URL` must be the public origin; it builds
  the email links.
- Supabase Auth URL configuration: Site URL can stay as the project owner
  needs. Add **Redirect URLs** `https://cosmosservicesllc.com/account/confirm**`
  (plus each preview origin). Email confirmations **on**; minimum password
  length 8.
- Email templates (Confirm signup, Reset password): link to
  `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email` (reset:
  `type=recovery`). Copies in `supabase/templates/`. The website's
  redirect URL always carries `?next=…`, which the `&` relies on. If another
  app in the same project sends reset emails, its redirect URLs need a query
  too, or the template must branch.
- **Custom SMTP** before launch: Supabase's built-in sender is rate limited to
  a few emails an hour and for testing only. Resend's SMTP works with the
  domain already verified for quote email. Sender, SPF/DKIM: Raj.
- **Rate limits**: see requirement 4 above; needs a reviewed design.
- Leave both values unset in Production until requirements 1–4 are met and
  verified on a paired Preview. Nothing was deployed or changed live.

## Tests

- **Unit, mocked** (`tests/unit/account.test.ts`, `quote-route.test.ts`):
  redirect allowlist (25 rejected inputs), config and cookie flags, handoff
  expiry/tampering, account view states (synthetic display data only), facade
  401 for signed-out/expired sessions, origin check.
- **Browser, real local Supabase Auth** (`tests/e2e/account.auth.spec.ts`,
  `npm run test:e2e:auth`, desktop and Pixel 7): needs `supabase start`
  (this repo's stack, API 54621, Mailpit 54624). Sign-up → confirm in a new
  tab → send without re-login; password-only return; unconfirmed + resend;
  reused link; enumeration; unsafe `next` values; return to `/q/<token>`
  (the Studio stub); wrong account; corrupted session → expired + facade 401;
  sign-out clears cookie and handoff; full reset; phone layout and tap
  targets; cookie flags; no personal data in any URL. 24 tests × 2 runs passed.
- These results are **website-local Auth only** (a separate isolated local
  project), recorded before the v2.1 contract was published.
- **Not tested: paired with the Studio.** The v2.1 contract now exists, but
  the website adapter is unbuilt, so there is no evidence yet of Studio
  identity verification, client binding, ownership on `/q`/`/pay`, cookie
  refresh through the gateway or v2 intake. Paired tests must use one
  isolated project for both apps' Auth and database. No hosted Supabase
  project, SMTP or Vercel edge was used.
