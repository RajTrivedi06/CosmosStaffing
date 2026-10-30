# Customer API v2: verification and review handoff

For website Codex's independent review. Implements the Studio's customer-auth
contract, **revision 2.1, API v2, Studio commit `cc738d2`**, on website base
`bdb8c97`; the sections up to "Open before production" describe `23ca9ec`. The
[review findings round](#review-findings-round-on-23ca9ec) below moves the
website to revision 2.2 and says what is and isn't verified for it.

**Production stays blocked.** Nothing is pushed or deployed, no hosted setting
changed, and no real message or payment was sent.

## What changed

- **Intake** (`src/lib/customer-api.ts`, `src/app/api/quote/route.ts`):
  `QUOTE_DELIVERY_MODE=customer` sends `{version: 2, submission_id, answers}`
  with the session's access token, the server credential and a matching
  `Idempotency-Key`. Success needs a committed 202/200 acknowledgment. Nothing
  from the browser is forwarded as identity.
- **Fail closed** (`src/lib/quote-intake.ts`): missing customer API or auth
  configuration, or Vercel Production, reads `studio_pending` and sends
  nothing. There is no legacy fallback and no second destination.
- **Account-bound work** (`src/lib/quote-store.ts`, `src/lib/account/owner.ts`,
  `QuoteFlow.tsx`): anonymous drafts are separate from signed-in work and are
  only offered for explicit adoption. Attempts are filed by owner tag and
  intake version. `/api/quote` rejects another account's attempt with 409
  `account_mismatch`. Sign-out clears drafts across open tabs and keeps only an
  unconfirmed attempt, shown to nobody but its owner.
- **Account data** (`src/lib/account/records.ts`, `labels.ts`,
  `src/app/account/page.tsx`, `src/app/account/requests/[id]/page.tsx`): real
  history and request details. Requests, accepted quotes, confirmed bookings and
  payments stay separate facts. The `/q` and `/pay` pages stay the Studio's.
- **Refused sessions**: a session the Studio rejects no longer loops. The
  account pages say so and end it (`SessionRejected`); the sign-in page checks
  with the Studio before continuing to a Studio page.
- **Configuration**: `QUOTE_STUDIO_TEST_ENABLED`, `STUDIO_CUSTOMER_API_URL`,
  `WEBSITE_INTAKE_SECRET` (`.env.example`). No new gate variable.

## Evidence, by kind

Never read one kind as another. Numbers are from the isolated snapshot of this
work, without the unrelated presentation changes.

| Kind                   | What ran                                                                                   | Result                                           | What it proves                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------- |
| Fixture / mocked       | Unit tests, including schema conformance against the Studio's own `customer-api/schema.ts` | 241 passed                                       | Adapter decisions, mapping, ownership checks, wording                     |
| Fixture, browser       | Main suite (`npm run test:e2e`, accounts off)                                              | 77 passed, 2 intentionally skipped (Studio mode) | Existing site unaffected                                                  |
| Real Auth, mock Studio | `tests/e2e/account.customer.spec.ts`, desktop and phone                                    | 18 passed (9 tests × 2)                          | The website's own behaviour only: the mock doesn't verify tokens          |
| Real website-only Auth | `tests/e2e/account.auth.spec.ts`, desktop and phone                                        | 34 passed (17 tests × 2)                         | Sign-in behaviour on this repo's local Supabase. Nothing about the Studio |
| **Real paired**        | `tests/paired/customer.paired.spec.ts` against running Studio `cc738d2`, desktop and phone | **32 passed (16 tests × 2)**                     | The items listed below, on one disposable project. Not hosted behaviour   |

### Real paired coverage

Website production build on `localhost:3350`, Studio on `127.0.0.1:3351`, one
isolated Supabase Auth/database project (`operations-studio-test-slot5`,
migrations through `20261030010000`), captured email. Synthetic accounts only.

- Sign-up and confirmation through the captured email, opened in a new tab,
  with no second sign-in and no token left in the address.
- Explicit adoption of pre-login answers; nothing loaded before the choice.
- Authenticated send, visible in the Studio's staff queue with its answers and
  "verified customer account".
- Real account history and request details.
- Retry: the real Studio committed (202), only the browser's answer was
  dropped; the retry replayed (200) and one record exists. A repeat request is
  a new submission.
- Cross-account denial: Bob's requests are empty; Alice's request, quote and
  payment read exactly like missing ones. Bob's real token against the Studio
  API got `404 not_found` for reading the request, reading, accepting and
  changing the quote, reading the payment and starting checkout.
- Protected links: signed-out `/q` and `/pay` go to sign-in and return to that
  exact link. Staff prepared, approved and sent a real quote through the Studio's
  own screens, and created a real payment link.
- Quote acceptance by the owner through the gateway's Server Action: the request
  then reads "Quote accepted · Not scheduled yet", never booked.
- Session refresh with rotated tokens through the gateway (`/q`) and through this
  site's proxy (`/account`); host-only HttpOnly Lax cookies preserved.
- A changed session in an open tab: nothing sent, answers removed from the
  screen.
- Sign-out: session cookies gone, another role's cookie untouched.
- A session revoked at Auth: refused by the Studio, no redirect loop, sign-in
  returns to the quote.
- Password recovery through this site's callback and the local template.

**Not covered by paired tests:** unverified-account denial (Auth won't issue
that session; the 403 mapping is unit-tested), a lost response between website
and Studio (unit-tested here; the same recovery path was paired above from the
browser side, and for v1 in `paired-adapter-verification.md`), a real Stripe
checkout, cleaner and staff regression beyond the cookie check, and anything on
a hosted project, Vercel edge or real SMTP.

### The launcher

`start-website.py` couldn't be used as supplied, so a local equivalent ran
instead (same private env and reservation handshake, no Studio file edited):

- It hard-codes the mixed `CosmosStaffing` tree, so it would not have tested this
  candidate. The website ran from the isolated review worktree, confirmed by the
  listener's working directory, as a production build.
- `website.env` sets `QUOTE_DELIVERY_MODE=studio`, which the website correctly
  treats as blocked. Only that value was overridden, in memory, to `customer`.
- Each paired project ran on a fresh website process: the per-instance limiter
  allows 5 sends in 10 minutes and shared one local bucket, by design.

### Local email templates

The lease's confirmation and recovery templates branch on the exact prefix
`http://localhost:3350/account/confirm?next=`, which is what the website sends,
and fall back to `.ConfirmationURL` otherwise. Both worked in paired tests. This
says nothing about hosted readiness: production needs the same review with its
own prefix, against staff and cleaner email flows.

## The sign-out failure

**Cause, captured:** under parallel signup mail, local Auth stalls (signups were
measured at up to 5.8 s), so the `/logout` call exceeded the 3 s limit. Timeline
from a failing run: POST sent at 423 ms, answered at 4579 ms, ending on
`reason=signed_out_local` with no session cookies left. **The product behaved
correctly**: the session was cleared and the page said revocation wasn't
confirmed. The test helper wrongly demanded the confirmed outcome, then waited
for a URL that couldn't arrive. A round trip over 4 s plus a slow page load also
explains earlier reports of `/account` at a 5 s limit. Both helpers now accept
either correct outcome.

**Ruled out, by test:** `getClaims` latency (local keys verify offline; a 12 s
delay on `/auth/v1/user` left sign-out at 89 ms), pre-hydration clicks (they
post natively and work), and clicks during hydration (72 of 72 under 6× CPU
throttling).

**Still unproven:** the first v2 failure was on `/account` at a 10 s limit, and
the captured run took about 4 s. It is probably the same mechanism under heavier
load, but that instance wasn't captured. Across 7 fresh-build rounds of 50 tests
it recurred once, in the form above.

## Findings for the Studio

1. `/q` and `/pay` have no link back to `/account`, so "Back to my account" only
   exists on website pages.
2. `start-website.py`: the hard-coded checkout and `QUOTE_DELIVERY_MODE=studio`
   above. Future leases should take the candidate path and use `customer`.
3. Website-originated jobs: the "Add job details" buttons don't reveal the scope
   form, which sits in the collapsed "Revise job details" panel. Not a blocker.

No backend defect was found.

## Review findings round (on `23ca9ec`)

Four findings from Codex's review of `23ca9ec`, built against revision 2.2,
Studio commit `ee9146e`.

1. **Anonymous data.** With accounts on, a signed-out visitor is asked only the
   choice questions (`preAccountSteps`). Only an explicit allowlist is kept or
   carried through sign-in (`carriedAnswers` in `src/lib/quote.ts`): service,
   property, bedrooms, bathrooms, area, frequency, condition, each a real
   option, so free text can't arrive in one of these fields. ZIP code, timing,
   date, extras, notes and contact details are asked after sign-in. The handoff
   is now version 2 and any other version is removed unread;
   `QuoteStorageSweep` runs on every page and `settleQuoteStorage` reduces the
   tab once the session is known. The sign-up page no longer pre-fills an email.
2. **Stored payloads.** An attempt's answers stay only while its owner is
   signed in here and for 7 days. Sign-out, an ended or refused session, expiry
   and archival each replace them with a marker: the submission ID and when it
   was made. Archives, including older ones, hold markers only. Retrying is
   only ever the same ID with the same stored answers.
3. **Service credential.** Only `401 {code: "unauthorized"}` means sign-in.
   `503 service_auth_failed`, any other 503, and any 401 without that exact
   code (a gateway or preview protection) read as temporarily unavailable, on
   customer intake and account reads. The session and attempt stay, and the
   browser only ever sees `unavailable`. Intake v1 keeps its own wording.
4. **Revoked session through `/quote`.** The sign-in page now checks with the
   Studio before continuing to any destination, not only Studio pages. A
   refused send shows its own screen, takes the answers off it and out of
   storage at once, and offers "Sign in again", a real sign-out. The next
   sign-in is a new session with the marker, and the resend keeps the ID.

**Review of `64e751d`: two P1s fixed** (`docs/customer-v2-review-64e751d.md`).

- A 409 no longer means received, and re-entered answers are no longer sent
  under a marker's ID: both were wrong, because a 409 can mean different
  content, version or principal, and a lost snapshot can't be rebuilt. Every
  conflict keeps the attempt unresolved with its original ID. Only a validated
  200/202 acknowledgment completes a request, and the browser now requires the
  Studio's receipt in customer mode. Conflict wording is opaque.
- A marker no longer ages out. Once only a marker is left, the quote stops at a
  reconciliation screen: the reference, the account, and "Start a separate
  request" after a confirmation, which is the only way to clear it. It holds on
  reload and after a sweep from any page. A damaged record leaves a marker with
  no ID rather than vanishing, and another intake version's record counts too,
  so a new attempt can't overwrite it. Set-aside markers lapse after 30 days;
  nothing depends on them. Answers still leave at 7 days at the latest.

**Password recovery, observed.** No revocation code was added. On the website's
local Auth (`supabase/config.toml`, not the paired project), with two older
sessions signed in and their JWTs valid for about 59 more minutes, a recovery
password update gave: older session at Auth `/user` 403; its refresh 400
`refresh_token_not_found`; the recovery session 200; old password 400; new
password 200. `tests/e2e/account.auth.spec.ts` pins the same result through the
website's real `/account/reset` page. The website's own local JWT check can't
see this until the token needs refreshing, so the older device's website
session stays signed in until then or until a Studio read refuses it. **The
Studio's answer to that older token is not observed yet**; the paired test
below asserts the expected 401.

**Written but not yet run, pending a paired reservation on revision 2.2:** in
`tests/paired/customer.paired.spec.ts`, a session revoked during a send, a wrong
server credential at the real Studio, and two-session recovery against the
Studio. The earlier paired flows were adapted to the new question order. A wrong
server credential end to end through a website process is not yet covered; the
mock and unit tests cover the website's mapping.

## Open before production

**Lifecycle (website):**

- Secure email change isn't implemented: no screen, and `/account/confirm` only
  accepts `email` and `recovery`. The contract's complete lifecycle isn't met.
- Password change outside recovery: with secure password change on, an older
  session's `updateUser` can need reauthentication; today that shows the generic
  unavailable message. Recovery itself passed paired.
- Recovery's effect on other sessions at the real Studio isn't observed yet;
  see the findings round.

**For review:**

- A marker stays in this browser until its owner confirms a separate request.
  It holds an ID and a date, and is shown only to them.
- There's no owner-verified way to look up a submission ID, so a marker can't
  resolve itself: the client checks their account or contacts us. If the
  earlier request did arrive, a separate request they confirm is a second one.
  Automatic recovery would need that lookup from the Studio; none is assumed.
- Confirming on another device can't bring choices across; they stay on the
  first browser.

**Release:**

- Hosted email templates, redirect allowlists, Auth settings and reliable SMTP.
- Distributed, per-client rate limiting and trusted IP handling. The tests'
  `VERCEL=1` proves nothing about production.
- Protected Preview checks of edge caching, cookies and Server Actions.
- Coordinated migration and application rollout, and rehearsal.
- Stripe checkout retry and session reconciliation (a Studio dependency).

## How to rerun

```bash
npm test
npm run test:e2e
npm run test:e2e:auth
```

Paired runs need a live lease, a website serving the candidate on the assigned
origin, and `PAIRED_WEBSITE_ENV` pointing at the lease's private `website.env`:

```bash
npx playwright test -c playwright.paired.config.ts
```
