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
   sign-in creates a new session. The retained marker blocks sending until the
   customer reconciles the earlier request or explicitly confirms a separate
   request with a new ID.

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
  nothing depends on them. Answers still leave at 7 days at the latest,
  including the tab's draft copy: the paired run caught that copy surviving
  expiry, so a marker now removes it wherever it's noticed.

**Password recovery, observed.** No revocation code was added, because none
is needed. A recovery password update ended the client's other sessions while
their JWTs were still unexpired. On the website's local Auth, with about 59
minutes left on those JWTs: Auth `/user` 403, refresh 400
`refresh_token_not_found`, the recovery session 200, old password 400, new
password 200. Paired, through the website's real reset page: the older session's
token at the Studio 401 `unauthorized`, its refresh 400, and that device's
account page reads as rejected. New-password sign-in finds the same records.
Until a Studio read or a refresh, the website's local JWT check still treats the
older device as signed in.

### Paired results for this round

**Tested commit `d2341928ea59ea5a79e0592444347c78df8fdb2c`**, Studio `ee9146e`,
contract 2.2, migration `20261030020000_customer_service_auth_errors.sql`, one
isolated project (`operations-studio-test-slot4`), website port 3360, Studio 3361. **44 of 44 passed: 22 on desktop, 22 on phone**, on that one commit.
From a clean checkout of it with `npm ci`: ESLint, TypeScript and Prettier
clean, 269 unit tests, main suite 77 passed with 2 intentional skips, real Auth
with mock Studio 70.

Real paired coverage added here:

- A session revoked during a send: 401, the sign-in-again screen, nothing
  sensitive left, no loop through sign-in, a real new session, then blocked at
  the marker with no record added until a confirmed separate request (202, a
  new ID, one new record).
- A real 409 from the Studio on a changed retry: unresolved, attempt kept.
  Another account using the same ID gets the identical opaque 409. The untouched
  snapshot then gets a 200 replay, and one record exists.
- Expiry and logout: answers and the tab's draft gone, the marker kept, still
  blocking at 1,000 days on reload and after a sweep, invisible to the next
  account, and only one record.
- Sensitive data from an earlier version removed by the sweep.
- A wrong server credential at the Studio: 503 `service_auth_failed`.
- A wrong server credential through the running website, using the lease's
  `--invalid-service-secret` mode: the browser saw 503 `unavailable`, the
  temporary message, the same session and the stored attempt, with no prompt to
  sign in. With correct configuration restored, the same session read its
  records and the same attempt went through once with its original ID.
- Two-session recovery, as above.

**This run caught one real defect:** after expiry the tab's draft still held the
answers. `d40d45d` fixes it. Two later commits are test-only: a test reused a
signed-out context, and the dev server's reload raced a navigation.

**Limits of this evidence.**

- The lease's launcher pins `64e751d`, so it was run unchanged on disk with only
  that hash replaced in memory; all its other checks ran.
- It runs `next dev`, so these paired results come from a development server.
  The production build ran only against mock Studio.
- The website's actual upstream reply to the wrong credential wasn't captured
  separately: the browser saw the mapped 503, and the Studio's exact body was
  checked directly with another wrong credential.
- A database-hash mismatch through the website wasn't exercised.

## Open before production

**Lifecycle (website):**

- Self-service email change is unavailable at launch, by decision: no screen,
  and `/account/confirm` only accepts `email` and `recovery`. The contract's
  both-address email change therefore stays out of launch scope.
- Passwords change only through the emailed link. A session needs an emailed
  link from the last hour; anything else is offered one. Recovery itself is
  paired-tested on `d234192`; the new rule is tested on real local Auth, and
  it depends on hosted Auth's `amr` values matching. Check that at cutover.

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
- Online payment is off for launch, by decision: the account shows payments as
  facts with no `/pay` link, and Cosmos arranges payment. `/pay` forwarding is
  unchanged, so Studio must not issue payment links until Stripe checkout and
  reconciliation are verified.

## How to rerun

```bash
npm test
npm run test:e2e
npm run test:e2e:auth
```

Paired runs need a live lease, a website serving the candidate on the assigned
origin, `PAIRED_WEBSITE_ENV` pointing at the lease's private `website.env`, and
`PAIRED_SITE_CONTROL` pointing at a script that restarts the website (the local
limiter allows five sends a process, and the credential test needs a wrong
credential). Its argument is `correct` or `invalid`:

```bash
npx playwright test -c playwright.paired.config.ts
```
