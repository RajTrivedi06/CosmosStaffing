# Client accounts

Website side of client sign-in, built 2026-10-30. The Studio owns verified
identity, linking an account to a client record, business permissions and the
upstream contracts; none of that is invented here. Canonical handoff:
`wt-integration-implementation/docs/03-guides/website-studio-integration.md`.

**Status (2026-10-30):** the website implements the Studio's customer-auth
contract, **revision 2.2, API v2, commit `ee9146e`**
(`feat/customer-auth-foundation`, `docs/03-guides/customer-auth-v2.md`).
Revision 2.1 (`cc738d2`) has been
**verified paired against a running Studio** on one isolated Supabase project. Evidence, its limits and the handoff are in
[customer-v2-verification.md](customer-v2-verification.md). **Production stays
blocked**: nothing here is deployed, and no hosted setting has changed.

## What clients get

- **Sign up** (`/account/signup`): email and password (8–72 characters). One
  confirmation email. The link signs them in on whatever tab or device opens
  it (Supabase token-hash flow, `/account/confirm`), so no second sign-in
  straight after confirming.
- **Sign in** (`/account/login`): password only, no email code. Unconfirmed
  accounts are told so and can ask for the link again.
- **Forgot / reset** (`/account/forgot`, `/account/reset`). Never says whether
  an email has an account; signing up with a taken email looks identical.
  "Sent" is shown only when Supabase accepted the request (it accepts the
  same way for unknown emails); a refused or failed request says so, keeps
  the email and offers a retry, and never claims an email went out.
- **Sign out**: asks Supabase to revoke this session (`scope: "local"`,
  waiting at most 3 s) through a client that can't write cookies, so a late
  answer changes nothing; then expires every `cosmos-client-auth` cookie
  (whole, chunked and code verifiers) whatever it answered. `sb-…`
  staff/cleaner cookies are untouched. The page says "You've signed out" only
  when Supabase confirmed the revocation; otherwise "You've signed out in this browser. We couldn't confirm server-side session revocation."
  Clearing this browser is not revocation, and no claim is made about when an
  unrevoked session stops working. Also forgets a quote waiting for sign-in.
- **Refused sign-in** keeps the typed email and the validated destination,
  clears the password and puts the cursor there; with or without JavaScript
  (the form's permalink carries `?next=`, and a native post to a Studio
  destination gets a server redirect, a full page load).
- **Account home** (`/account`): email, New request, Sign out, and the
  client's real records from the Studio's customer API
  (`src/lib/account/records.ts`): quotes to review first, then upcoming
  cleanings, requests and completed cleanings, with older pages. Each request
  shows separate facts (`src/lib/account/labels.ts`): its progress, whether a
  quote was accepted, whether a cleaning is **booked** (only the Studio's
  `confirmed` status) and payment. Accepting a quote never reads as a booking.
  `linked: false` reads as "no requests yet". An unavailable Studio, an
  unconfirmed email or a rejected session each say so; nothing is guessed, and
  with the customer API off the page says records aren't connected.
- **Request page** (`/account/requests/<id>`): that request's answers, quotes
  and payment requests, linking to the Studio's own `/q/…` and `/pay/…` pages,
  which stay the Studio's. Another client's request reads exactly like a
  missing one.
- **Quote**: choice questions → create account / sign in → where, when, notes
  and contact details → review → send. Choices from before sign-in are only
  ever **offered** ("Use these answers" / "Start fresh"). Signed-in clients
  send as themselves ("Sending as …"), and the quote's top link becomes "My
  account". `/api/quote` requires a verified session whenever accounts are on
  (401 `sign_in_required`). If the session has ended or the Studio refuses it,
  the screen takes the answers off itself and out of storage, keeps the
  attempt's ID, and offers "Sign in again", a real sign-out, because the
  sign-in page can't offer a new session while old cookies still verify. A
  refused server credential (503 `service_auth_failed`) isn't the client's
  problem: it reads as temporarily unavailable, and the session and attempt
  stay.

## How it works

| Concern                 | Implementation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Library                 | `@supabase/ssr` 0.12.7 and `@supabase/supabase-js` 2.118.0 (pinned), server only. No browser Supabase client and no tokens in JavaScript.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Identity checks         | `getClaims()` everywhere (`src/lib/account/server.ts`), never `getSession()`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Session refresh         | `src/proxy.ts` (Next 16 proxy), only on `/account*`, `/quote` and `/api/quote`, never on the Studio's forwarded paths. Applies Supabase's no-cache headers on refresh and marks the page `private, no-store`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Cookies                 | `cosmos-client-auth` (+ `.N` chunks, PKCE verifier): host-only (no Domain), `HttpOnly`, `SameSite=Lax`, `Secure` except on loopback dev hosts. The name deliberately differs from Supabase's default `sb-<ref>-auth-token`, which cleaners' `/me` uses.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Private responses       | `/account*`: `Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow, noarchive`, `Referrer-Policy: same-origin` (next.config `headers()`; `no-referrer` made browsers send `Origin: null` on native form posts, which Next's Server Action CSRF check refuses), `/account/confirm`'s one-time token link `no-referrer`, plus `robots` metadata. `/account/confirm` answers 303 with a relative Location.                                                                                                                                                                                                                                                                 |
| Return-to               | `src/lib/account/destination.ts`: an allowlist of whole paths, `/account`, `/quote`, `/q/<token>`, `/pay/<token>` (16–128 URL-safe chars). Anything else, including every absolute, protocol-relative, backslash, query or `/me` value, becomes `/account`.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Studio destinations     | Opened with a full page load (`ContinueTo`, plain `<a>`), never next/link.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Answers through sign-in | With accounts on, a signed-out visitor is asked only the choice questions (`preAccountSteps`). Only an explicit allowlist survives (`carriedAnswers`: service, property, bedrooms, bathrooms, area, frequency, condition, each a real option), in the tab's draft and in `src/lib/quote-handoff.ts`: `localStorage` so a confirmation opened in a new tab finds it, version 2, 24-hour expiry, cleared on send and on sign-out, never in a URL. ZIP code, timing, date, extras, notes and contact details are asked after sign-in. Older records holding more are removed: `QuoteStorageSweep` runs on every page, and `settleQuoteStorage` reduces the tab once the session is known. |
| Whose work it is        | `src/lib/quote-store.ts`: a signed-in client's draft (sessionStorage) and send attempt (localStorage, so every tab sees an unconfirmed one) are filed under an opaque owner tag derived on the server (`lib/account/owner.ts`) and the intake version. Another account, or another intake version, never reads them. `/api/quote` compares the tag with the live session and answers 409 `account_mismatch`; the screen then drops the answers.                                                                                                                                                                                                                                        |
| Unknown outcomes        | An attempt's answers stay only while its owner is signed in here and for 7 days. On sign-out, an ended or refused session, expiry or archival they become an **unresolved marker**: the submission ID and when it was made, nothing the client entered, kept 30 days and shown only to its owner. The next send from that account reuses the ID: Studio's 202 means the original never arrived, 200 that it was identical, and 409 that it arrived with other answers, which the screen reports as already received without sending these. Only "Start a separate request", after a confirmation, mints a new ID. No screen says an unknown outcome failed.                            |
| Off switch              | Accounts are on only when `AUTH_SUPABASE_URL` and `AUTH_SUPABASE_PUBLISHABLE_KEY` are set. Unset, every account page says accounts aren't open and the quote behaves exactly as before.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

**Delivery.** `QUOTE_DELIVERY_MODE=customer` selects authenticated intake v2
(`src/lib/customer-api.ts`): `{version: 2, submission_id, answers}`, the
session's access token as the bearer, the server credential and a matching
`Idempotency-Key`, built on the server from nothing the browser sent. Success
needs Studio's committed acknowledgment (202 new, 200 replay). It **fails
closed**: if the customer API or auth configuration is missing, or on Vercel
Production, the mode reads `studio_pending` and nothing is sent, with no
fallback to legacy and no second destination. `QUOTE_DELIVERY_MODE=studio`
remains the isolated v1 test adapter; a v1 attempt is never sent as v2.

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

## Integration requirements: where each stands

1. **Verified identity and client linking.** The Studio verifies the bearer
   token and links the account itself; the website asserts nothing. _Verified
   paired on a disposable project, not on hosted settings._
2. **Ownership on quote and payment pages and actions.** Enforced by the
   Studio. The website's sign-in redirect and wrong-account screen are
   navigation only. _Verified paired, including a second account's real token
   against the API directly._ The Studio never sends `reason=wrong_account`
   (another owner's link reads as not found), so that screen stays generic.
3. **Fail closed in production.** _Done on the website:_ see Delivery above.
   Vercel Production is refused by both applications; lifting either guard is
   a separate reviewed release change.
4. **Server-side auth rate limiting needs a reviewed deployment design.**
   _Open._ Every Supabase Auth call comes from the website server, so provider
   per-IP limits are shared by all clients. Raising provider limits is not
   enough on its own. The design must cover per-client limits on sign-in,
   sign-up, resend and reset (e.g. Vercel WAF rules on `/account/*` Server
   Action POSTs), whether and how the real client IP reaches Supabase, and
   which forwarded-IP headers are trusted. The browser tests set `VERCEL=1`
   only so each test gets its own quote-limiter bucket; that proves nothing
   about production forwarded-IP handling.

## Configuration needed (names only; no values here)

- Website env: `QUOTE_DELIVERY_MODE=customer`, `QUOTE_STUDIO_TEST_ENABLED=true`
  (isolated test or protected Preview only), `STUDIO_CUSTOMER_API_URL` (the
  fixed Studio origin plus `/api/customer/v2`), `WEBSITE_INTAKE_SECRET`,
  `AUTH_SUPABASE_URL` (HTTPS, the Studio's project),
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

Three kinds of evidence, never interchangeable. Results and limits are in
[customer-v2-verification.md](customer-v2-verification.md).

- **Fixture / mocked**: `tests/unit/*` (`account`, `account-actions`,
  `account-records`, `customer-api`, `customer-route`, `quote-route`), and
  `tests/e2e/account.customer.spec.ts`, which uses real local Auth but a
  **mock** of the Studio (`customer-api-stub.mjs`) that doesn't verify tokens.
- **Real website-only Auth**: `tests/e2e/account.auth.spec.ts`
  (`npm run test:e2e:auth`, this repo's own local Supabase). Proves nothing
  about the Studio.
- **Real paired**: `tests/paired/customer.paired.spec.ts`, against a running
  Studio on one isolated Supabase project assigned by the integration lead.
