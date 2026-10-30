# Operations Studio integration

## Authentication contract update (2026-10-30)

Studio has now published customer-auth v2, revision 2.1, at `cc738d2` on
`feat/customer-auth-foundation`:
[customer-auth-v2.md](../../wt-integration-implementation/docs/03-guides/customer-auth-v2.md).
This is an additive authenticated API; intake v1 below is unchanged. References
below to an unresolved authentication decision describe the earlier v1 work.
The v2 adapter is not implemented by this prerequisite commit. Production Studio
delivery remains blocked and legacy remains the default. See the
[foundation handoff](website-foundation-handoff.md) for exact remaining work and
commit ownership; neither fixture tests nor the earlier paired v1 tests prove
an authenticated Studio journey.

## What this file is for

How this website and the Operations Studio (`internal-tools-cosmos`) share
`cosmosservicesllc.com`, what is built on the website side, and what Raj must
decide or arrange in the Studio. The canonical intake contract is the implementation worktree's
[website-studio-integration.md](../../wt-integration-implementation/docs/03-guides/website-studio-integration.md),
branch `feat/website-intake-assisted-onboarding`, commit `c456d95`.
Checked against that commit on 2026-10-29: **no canonical contract changes**.
The worktree later advanced to `3fa253c` with rollout documentation only; the
canonical contract and executable intake implementation remain at `c456d95`.
The new [rollout companion](../../wt-integration-implementation/docs/03-guides/website-studio-rollout.md)
explicitly keeps intake v1 frozen; proposed identity requirements are not a new
wire contract. Gateway details also come from the Studio's
`docs/03-guides/connect-company-domain.md`, ADR 0004,
`docs/product/workflow-plan.md` ("Public Website Intake (2026-10-28)"),
`docs/02-reference/security.md` and `docs/product/cleaner-onboarding.md`.
No Studio source, schema, deployed database, DNS or Vercel domains were changed
from here. The later paired test created synthetic inquiries only in the assigned
isolated database through the existing intake API; see the verification report.

## Client accounts (2026-10-30)

Email/password sign-in, the account home and authenticated customer intake
v2 are described in [client-accounts.md](client-accounts.md); paired evidence
and the review handoff are in
[customer-v2-verification.md](customer-v2-verification.md).

## Built on the website (2026-10-29)

| What                                                                                                                                                                                 | Where                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Forwarded paths, exactly as documented: `/pay/:path+`, `/join/:path+`, `/q/:path+`, `/o/:path+`, `/me`, `/me/:path+`, `/terms`, `/studio-assets/_next/static/:path+`                 | `src/lib/studio-routes.ts`, `beforeFiles` rewrites in `next.config.ts`                                                                                               |
| Their no-store / noindex / no-referrer headers, exactly as documented                                                                                                                | `vercel.json` (the guide's own location: Vercel's edge adds them to forwarded responses; `next start` does not apply next.config `headers()` to forwarded responses) |
| Never forwarded: `/login`, `/api`, `/_next`, `/apply`, bare `/join` `/pay` `/q` `/o`                                                                                                 | checked by `tests/unit/studio-routes.test.ts` and `tests/e2e/studio-routes.spec.ts`                                                                                  |
| The website's own `/terms` page removed; "Terms" links are plain `<a>` to the Studio's `/terms`; `/terms` left out of the sitemap (the Studio marks it noindex)                      | footer, services page                                                                                                                                                |
| "Clean with Cosmos" page for independent cleaners, a short note at the end of the home page, links in the footer and the phone menu                                                  | `src/app/(site)/clean-with-cosmos`, `CleanTeaser`, `cleaners` in `site.ts`                                                                                           |
| Contact page: two separate actions, "Request a cleaning / Get a quote" and "Cleaner onboarding", plus "Cleaner sign-in"                                                              | `src/app/(site)/contact`                                                                                                                                             |
| "Cleaner sign-in" is a plain link to `/me/login` (phone number and texted code). Nothing links to the staff `/login` or to `studio.cosmosservicesllc.com`                            | `CleanerSignIn`                                                                                                                                                      |
| Application call to action controlled by `cleaners.apply.available` (now `false`): explains invitation-led onboarding and that public applications are unavailable; no `/apply` page | `ApplyAction`                                                                                                                                                        |
| No cleaner data collected: no form, input, table, upload or "leave your number" on the website                                                                                       | `tests/e2e/cleaners.mobile.spec.ts`                                                                                                                                  |
| `STUDIO_ORIGIN` (build time, optional) points the rewrites at a Studio preview for paired staging; an HTTPS origin (HTTP only on localhost)                                          | `.env.example`                                                                                                                                                       |

## Requests for the Studio (Raj to arrange)

1. **Invitation-led onboarding.** Staff assist onboarding or issue a private
   `/join/<token>` link. The questionnaire does not require a password-based
   account. `/me/login` is cleaner SMS verification for the portal/signing,
   not a client or staff login. No public application endpoint is requested
   as part of this work. `cleaners.apply.available` remains false; enabling a
   public application would require a separate confirmed Studio contract and
   coordinated allowlist change. Never publish a shared invitation token.
2. **Cleaner sign-in through the company domain.** The Studio accepts
   Server Actions from the request's own host plus the origin it derives from
   `NEXT_PUBLIC_PUBLIC_BASE_URL` (`serverActions.allowedOrigins`). Forwarded
   through the website, `/me/login` posts from the website's origin, so test
   the code request and sign-in through a paired preview; if they are
   refused, set the Studio's public base URL to that website origin (at
   cutover, the company domain). Nothing changes on the website side.
3. **Check the headers on a Vercel preview.** After a paired preview is up,
   `curl -sI https://<website-preview>/me/login` should show
   `Cache-Control`, `CDN-Cache-Control`, `X-Robots-Tag` and
   `Referrer-Policy` from `vercel.json`. Vercel consumes
   `Vercel-CDN-Cache-Control` itself, so check it by requesting the same
   path twice and confirming no cache HIT (`x-vercel-cache`). This could not
   be verified locally.
4. **Quote requests into Studio.** The `c456d95` intake contract is implemented
   in the website adapter for isolated tests. Customer authentication and binding
   remain unresolved. See the adapter status and paired-test prerequisites below;
   no production cutover is enabled.
5. **Terms text.** The Studio's `/terms` says "final text coming soon". The
   website's removed terms page had outlined these topics, each awaiting
   approved wording; they may help the Studio's text:
   - quotes: how they are prepared, how long they are valid, what can change
     the final price;
   - scheduling and access: booking confirmation, arrival windows, keys and
     door codes;
   - cancelling or rescheduling: notice period and any fees;
   - if something isn't right: how to report it, the re-clean policy;
   - insurance and liability: cover, breakages, damage claims;
   - payment: methods, invoicing, when payment is due;
   - providers: how they are vetted, the Cosmos–provider relationship;
   - privacy: how quote and contact details are stored and used.

## Decisions for Raj

1. **Cleaner insurance wording.** Decision 2026-10-20 (Studio
   `decisions.md`): Cosmos covers 1099 cleaners under its company insurance,
   so they don't need their own. The site says only "You don't need your own
   insurance to apply" and leaves the cover as
   `[PLACEHOLDER: what Cosmos's company insurance covers for independent cleaners]`.
   The scope is unresolved: `cleaner-onboarding-plan.md` still lists an
   optional insurance upload ("stays optional or becomes a gate item"), and
   plans a DWC-85 signature for cleaners whenever the
   `workers_comp_nonsubscriber` setting is on. That is a plan, not proof of
   current cover or of the setting, but it shows injury cover is a question
   the public wording must not answer by accident.
   Please confirm what the policy covers and the exact public wording.
2. **Recruitment placeholders.** Pay rates and earnings, how long a review
   takes, background checks (not live yet), how much work to expect, payout
   timing and process.
3. **"Get my price" versus the Studio's wording.** The Studio's intake plan
   says to use "Get a quote" or "Request a cleaning" until availability and
   booking confirmation are supported. This site keeps the agreed "Get my
   price" (it shows no price; it starts a request reviewed by staff) and uses
   "Request a cleaning / Get a quote" on the Contact page. Confirm or switch.
4. **Client authentication.** The user's 2026-10-29 direction supersedes the
   older workflow-plan proposal that an estimate needs no account. The target
   journey is questions → review → client authentication on the company
   website → final submission, with answers preserved. The method and routes
   await the Studio session's decision. Do not reuse cleaner `/me/login` or
   staff `/login` for clients.

## Website intake preparation (2026-10-29)

`QUOTE_DELIVERY_MODE` is a website-only release control, not a Studio contract:

- Unset or `legacy`: retains the existing `quote_requests` inbox. Only a
  successful database response containing the created row ID confirms success.
  Email is sent after persistence and is only a notification; email alone
  never counts as a saved request. No stored rows, schema or migrations changed.
- `studio`: the review screen still displays the disabled client-sign-in
  placement. `/api/quote` returns 503 `studio_pending` unless the separate,
  server-only isolated test gate is explicitly configured. Production always
  rejects this gate. No legacy write/email or fallback occurs in Studio mode.
  Unknown mode values fail closed. This flag alone does NOT activate delivery.
- The page reads the setting at request time. An already-open legacy screen
  also handles `studio_pending` without deleting answers or falling back.
- The legacy path is still unauthenticated. The future authentication gate is
  prepared only in Studio mode; this is not a completed client login.

The website-owned `/api/quote` retains `{ ok: true, id }` at HTTP 200 for legacy
persistence. Studio requires HTTP 202/new or 200/replay with exactly
`{ ok: true, receipt_id: <UUID>, status: "received" }`. The server validates
this committed acknowledgment before forwarding it; the browser checks it
before clearing its draft or showing success.
Network failures, bad acknowledgements and unavailable delivery retain the
answers. Retry is available after failure; ambiguous network failures say
persistence could not be confirmed rather than asserting nothing was saved.
Concurrent clicks are blocked while a request is pending.

Drafts use the existing `cosmos-quote-draft` sessionStorage key. Full answers
stay in the same browser tab; only the existing non-contact choices appear
in share URLs. Same-tab navigation/reload is supported. Blocked browser
storage, new tabs, tab closure and cross-device auth do not yet have a durable
recovery guarantee. Do not put contact details or full drafts in auth return
URLs. Authentication handoff must specify how to cover these cases before
calling the journey complete.

### Questionnaire field inventory — mapped to intake v1

Intake v1 uses these same answer names and enum strings. `toStudioIntake`
preserves capped ranges, unknown choices, extras and free text; it omits
inactive size/frequency/date fields. The immutable raw attempt remains in
sessionStorage. These are staff-review answers, not exact pricing inputs.

| Website field            | Current values/meaning                                                                                              | Meaning retained in Studio v1                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `service`                | `regular`, `deep`, `move`, `office`, `other`                                                                        | Accepted service IDs; move-in versus move-out is not separately collected                     |
| `property`               | `house`, `apartment`, `townhouse`; `office`, `retail`, `commercial`                                                 | Residential/commercial classification and unknown routing                                     |
| `bedrooms`               | `Studio`, `1`, `2`, `3`, `4`, `5+` (home)                                                                           | Preserve capped range; not an exact bedroom count                                             |
| `bathrooms`              | `1`, `2`, `3`, `4+` (home)                                                                                          | Half baths are not collected; preserve capped range                                           |
| `area`                   | `under-1500`, `1500-4000`, `4000-10000`, `over-10000`, `unsure` (workplace)                                         | Area range, not exact sqft; home sqft absent                                                  |
| `frequency`              | `weekly`, `biweekly`, `monthly`, `unsure`; workplace also `several`                                                 | Asked only for regular/office; no invented schedule or first-visit price                      |
| `condition`              | `kept`, `some`, `lots`; move uses `empty`, `partly`, `furnished`                                                    | Move occupancy and cleaning condition are different concepts                                  |
| `zip`                    | Five-digit string                                                                                                   | Coverage review; no full address collected                                                    |
| `timing`, `date`         | `asap`, `two-weeks`, `month`, `flexible`, `date`; date `YYYY-MM-DD`                                                 | Preference, not booking/availability or a timezone timestamp                                  |
| `extras`                 | Home: `pets`, `oven`, `fridge`, `windows`, `sensitivities`; work: `after-hours`, `kitchen`, `restrooms`, `security` | Scope flags/context, not priced catalog quantities; avoid double-charging included work       |
| `notes`                  | Free text, up to 1,000 characters                                                                                   | Preserve text; never log it or place it in a URL                                              |
| `name`, `email`, `phone` | Name/email/phone required                                                                                           | Verified client identity and contact reconciliation; form email is not authenticated identity |

The website does not collect full service address, exact sqft, half baths,
restroom counts, extras quantities, supplies/travel responsibility, photos,
promo/referral eligibility or confirmed availability. The current fields
support staff review; they do not justify an instant final price or booking.
Changing service can leave inactive fields in the raw draft. The mapper includes
only applicable structured fields, while retaining the raw attempt locally.
The copied upstream schema rejects unknown/privileged fields. Website validation
is stricter on phone (nonblank required) and uses its existing bounded strings;
upstream's empty-phone allowance does not weaken the website requirement.

### Implemented adapter and remaining handoff (2026-10-29)

`src/lib/studio-intake-contract.ts` mirrors the exact upstream v1 schema.
`src/lib/quote-attempt.ts` validates the website attempt and maps it to the
canonical envelope. `src/lib/studio-intake.ts` is server-only and calls only
`STUDIO_INTAKE_URL` at `/api/webhooks/website`, with `Content-Type`,
`X-Webhook-Secret` and `Idempotency-Key` matching `submission_id`. It constructs
headers from scratch, forwards no browser cookies/authorization/host headers,
uses no-store and rejects redirects. The secret never enters client code.

The facade accepts `{ submission_id: <UUID>, answers: <website answers>,
website?: <honeypot> }`. Already-open legacy tabs with flat answers remain
supported only in legacy mode. Unknown keys and asserted identity IDs are rejected.
Studio success retains the canonical receipt envelope. A 409 remains an explicit
`idempotency_conflict`; upstream 401/503 map to unavailable, transport/malformed
acknowledgments to 502 `delivery_failed`. No upstream body/details are exposed.

Before first transport, the browser persists a detached answer snapshot and full
UUID in `cosmos-quote-attempt`. Transport retries and reloads reuse both; a new
service URL cannot override an unresolved attempt. Editing is locked while that
attempt is active. A deliberate **Start a separate request** confirmation archives
the original under `cosmos-quote-attempt-archive-<UUID>` in this tab before allowing
edits and a new ID. Cancel preserves the original. A corrupt stored attempt blocks
submission instead of silently minting another ID. If session storage cannot retain
the attempt, submission is blocked with an explanation. Archives survive until tab
storage is cleared; they are not a server recovery service. No PII is added to URLs.
Legacy storage still lacks a unique `request_id` constraint: these client safeguards
**do not make legacy retries exactly once**. Contact guidance remains for uncertain
legacy outcomes. No table, record or migration was changed.

The isolated API test gate requires all of:

- `QUOTE_DELIVERY_MODE=studio` and `QUOTE_STUDIO_TEST_ENABLED=true`;
- server-only `STUDIO_INTAKE_URL` with the exact path and no URL credentials,
  query or fragment; server-only `WEBSITE_INTAKE_SECRET` of at least 24 characters;
- local loopback with no Vercel environment, or explicit `VERCEL_ENV=preview`
  with HTTPS. Known production Cosmos hosts are rejected. Vercel Production is
  always rejected, including when the test flag and secret are configured.

This gate permits synthetic API tests only, and does not unlock the questionnaire's
customer authentication boundary. A Preview label does not prove database isolation:
the Studio owner must verify a non-production project, matching DB secret hash,
`WEBSITE_INTAKE_ENABLED=true`, exact migrations and disabled real messaging/payments.
Do not provision pending-identity credentials in production or relabel it as Preview.

### Public facade abuse controls

`quote-request-guard.ts` streams a maximum **16,000 UTF-8 bytes**, regardless of
Content-Length, and rejects invalid UTF-8. Both legacy and isolated Studio paths
require JSON and reject cross-site Origin/Sec-Fetch-Site requests before delivery.
Honeypot requests are rejected without fake success. All responses are uncached;
request/contact/answer/secret/token bodies are not logged.

The bounded per-instance limiter permits five attempts per ten minutes, counts
invalid attempts before body parsing, expires buckets, limits bucket count and
returns 429 with Retry-After. It trusts forwarding IP headers only in the Vercel
runtime; local callers share a bucket. This is defense in depth, **not a distributed
rate-limit guarantee**. Before any public Preview or rollout, configure and verify
a shared Vercel WAF rule for POST `/api/quote` (initial policy: five requests per
IP per ten minutes, reviewed against shared-network usage), plus Preview access
protection for synthetic tests. Do not forward proxy-supplied untrusted IPs or rely
on the upstream secret as bot protection. No deployed firewall rule was changed.
References: [Vercel request headers](https://vercel.com/docs/headers/request-headers),
[Vercel rate limiting](https://vercel.com/kb/guide/add-rate-limiting-vercel).

### Paired test / authentication dependencies

The assigned local pair has now been verified: website `localhost:3310`, Studio
`127.0.0.1:3311`, isolated slot-3 Supabase API/database ports `54721`/`54722`.
See [real paired verification](paired-adapter-verification.md) for exact evidence,
fault-injection limits, the launcher issue and cleanup ownership.

The actual website adapter received committed receipts, created inquiries visible
in Studio, retained one record chain through concurrent retries, rejected changed
content with 409, and passed validation/failure/production-guard checks. Local
public assets, redirects and an invalid-phone Server Action also passed. These
checks supersede the earlier environment-unavailable status; they do not establish
the authenticated browser journey or deployed edge behavior.

Remaining dependencies:

1. Protected paired Preview: explicit website/Studio origins, shared WAF rule,
   server-only secret provisioning, successful auth/session Server Actions, host-only
   cookies, namespace/allowlist and actual edge no-store/no-cache-HIT checks.
2. Customer auth method and recovery; verified session/proof transport; trustworthy
   customer-to-client binding and claim rules; identity-aware retries/account switching;
   CSRF/cookie/return routes and durable draft recovery across authentication. Cleaner
   `/me/login`, staff `/login`, form contacts and a receipt are not customer identity.
3. Separately authorized valid invitation/quote/offer/payment and real OTP checks,
   coordinated migration/application rollout, reconciliation and deployment approval.

The website process is stopped. Studio and slot 3 were left running for their
owner's coordinated teardown; they are no longer required for these completed checks.

### Preserve old leads and cut over once

No legacy-record export, import, deletion, database write, backfill or live setting
change was performed here. Existing records remain in place and need an accountable
reconciliation plan, including older email-only leads from the prior behavior.

1. Before cutover, the Studio owner inventories the existing inbox and email
   records, assigns a reconciliation owner, and securely retains the old
   `id`, `request_id`, `created_at`, status, contact fields and full `answers`.
   Existing records must remain accessible until reconciliation is signed off.
2. Agree a high-water mark and import/triage procedure. Import deduplication
   must use a stable legacy record ID, preserve timestamps/status/context and
   track source-to-Studio IDs. Do not automatically email old leads again.
3. Implement and verify the authenticated Studio adapter on isolated fixtures.
   Reconcile counts and exceptions for historical records separately from live
   delivery; an old-lead import is not a permanent second submission path.
4. Coordinate an explicit single-destination cutover and drain/reconcile any
   in-flight legacy submissions at the boundary. Studio mode never falls back
   to the legacy inbox on failures. Never send each new request to both systems.
5. On a Studio outage, keep drafts/retry and report failure. Any operational
   rollback to legacy must be explicit, time-bounded and reconciled before
   resuming Studio delivery. Keep the old table and migration history intact.

### Domain and verification boundary

The checked-in rewrite list and Vercel header template match the Studio guide
exactly. Website `/_next` stays separate from `/studio-assets/_next/static`.
Cross-zone links are normal anchors; public navigation uses relative company
paths. The production canonical URL now defaults to `https://cosmosservicesllc.com`.
Only Stripe-hosted checkout is an approved payment departure.

Local tests use a synthetic upstream, never the real Studio or production
credentials. They cover allowlisting, query/body/method forwarding, action/RSC
headers, host-only cookies, relative redirects and upstream security headers.
They do not prove real authentication, token authorization, payment processing,
Vercel edge headers/caching, deployment protection, or production redirect hosts.

Before release, the Studio owner must configure its public base URL for the
paired website origin and later the company domain, and verify its generated
links, action origins, host-only cookies and Stripe returns. On paired staging,
exercise real invitation save/resume, cleaner SMS/portal, quote acceptance,
offer responses and Stripe sandbox checkout through the website, including
invalid-token/error/POST/RSC privacy headers and repeated no-cache responses.
Check no navigation/redirect exposes the staff Studio host. No website-side
rewrite can correct an upstream absolute redirect to the wrong configured host.
DNS, authentication settings and live domain settings remain unchanged.

### Historical verification — gateway preparation

- Production build, TypeScript, ESLint and `git diff --check` passed.
- 58 unit tests passed, including pinned rewrite/header contracts, persistence
  failures, invalid acknowledgements, notification failures and blocked Studio
  delivery with no legacy calls.
- 29 relevant desktop/mobile browser cases passed across targeted runs: quote
  navigation, acknowledgements/retry, draft recovery, pending client-sign-in
  placement, recruitment boundaries, and synthetic gateway contracts. Initial
  fixture import and ambiguous alert-selector failures were corrected and the
  affected cases rerun successfully.
- Desktop/mobile pending-state screenshots were visually inspected. This is
  presentation and local gateway validation, not a real Studio/auth/payment
  integration test.

Reproduce against isolated local fixtures:

```sh
npm test
npm run typecheck
npm run lint
npm run test:e2e -- tests/e2e/quote.spec.ts tests/e2e/studio-routes.spec.ts tests/e2e/cleaners.mobile.spec.ts
E2E_QUOTE_MODE=studio npx playwright test tests/e2e/quote.spec.ts --grep 'Studio pending mode'
```

The first browser run deliberately skips the two Studio-mode cases; the second
runs those two with submission blocked. Keep test ports 3200/3299 isolated from
any manually started servers, since Playwright may reuse a local server.

## Questionnaire usability follow-up (2026-10-29)

The user reserved hero assets, shared imagery, navbar, scrolling and the mobile
service selector for Claude. This follow-up edits only questionnaire code,
questionnaire-scoped CSS, tests and this document. No shared marketing stylesheet,
asset, navigation, scroll or service-selector implementation was changed here.

Already present before this follow-up:

- Conditional questions, Back/Continue navigation, same-tab session drafts,
  service-prefilled quote links and review/edit controls.
- Persistence acknowledgement before success, failure/retry states, an in-flight
  submission guard, the legacy delivery default, and the blocked Studio/client-auth
  boundary. These behaviors remain in place; no endpoint, login or payment flow
  was introduced or enabled.
- Marketing service descriptions/FAQs, staffing redirects and recruitment links.
  Navbar direction handling, small-scroll scene progress, mobile shared-CTA
  selection and matching nighttime family assets also existed in the inspected
  implementation. These were inspected, not rebuilt or certified complete here.

Questionnaire changes:

- Component-scoped small-screen spacing, dynamic viewport minimum height,
  `interactive-widget=resizes-content` on `/quote`, and inputs at least 16px to
  avoid focus zoom on phones. Controls remain in document flow; a visible-viewport
  resize brings an obscured active field into view. The questionnaire opts out
  of the existing wheel smoothing through its local container; shared scrolling
  code is unchanged. Browser zoom remains available.
- Incoming questions receive focus after the outgoing screen unmounts. Validation
  errors are focusable and associated with affected controls. Contact fields
  support Enter/Next navigation. Rapid Continue clicks cannot skip a question or
  submit while the next screen is still appearing. Keyboard/reduced-motion step
  changes do not slide; pointer transitions are shorter.
- Partial/older session drafts recover valid fields without trusting arbitrary
  stored object shapes. Contact details and unrelated answers survive branch
  changes; incompatible choices (for example home-only extras on a workplace
  request) are cleared so the visitor cannot be trapped by hidden selections.
  Blocked browser storage is explained without claiming a reload-safe save.
- The preferred date remains a native date input with an accessible label,
  associated validation/help text, and keyboard-operable Tomorrow/In one week
  shortcuts. Shortcuts and the UI minimum use the visitor's local calendar day,
  including month/year rollovers. Shared validation rejects impossible calendar
  dates; it does not invent service availability. The payload is still the
  existing `timing` and `date` fields, with no time or timezone added.

Deferred website work / ownership handoff:

| Reserved file(s)                                                                                        | Intended follow-up after coordination with Claude                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/layout/SiteNav.tsx`, `src/app/globals.css`                                              | Verify stable CTA geometry and dark-button-only compact appearance; smooth reversals without jitter. The inspected version changed CTA padding/font size and retained the brand.                                                                   |
| `src/components/home/ServicePicker.tsx`, `src/app/globals.css`                                          | The inspected normal-motion selector used vertical page scrolling; native horizontal swipe existed only under reduced motion. Coordinate the requested horizontal-swipe behavior without replacing Claude's work.                                  |
| `src/components/home/DayScroll.tsx`, `src/components/providers/LenisProvider.tsx`, `src/lib/scroll.ts`  | Continue scene pacing and real touch/trackpad review with the owner. No shared scroll changes in this follow-up.                                                                                                                                   |
| Hero/Evening/ArtImage components, `public/images/`, `src/lib/metadata.ts`, imagery in `src/lib/site.ts` | Final readability, subject framing and warm nighttime crop review. Assets changed during this task; no asset was replaced here.                                                                                                                    |
| `src/lib/site.ts`                                                                                       | Remove the remaining FAQ claim “There is no account to create” when Claude releases the shared copy file. The forthcoming client-auth journey makes that promise inappropriate. Keep unconfirmed policies/insurance placeholders pending approval. |

No database, existing lead records, delivery configuration, authentication settings,
Studio files, live domains or DNS were changed. No deployment was performed.
The intake/authentication dependencies and cutover procedure above still apply.

Historical verification — questionnaire usability:

- Production build, TypeScript, ESLint and whitespace checks passed. All 77 unit
  tests passed, including 19 new date/draft recovery cases.
- Final isolated browser runs passed 30 normal-mode desktop/mobile questionnaire
  cases and two Studio-pending boundary cases. Coverage includes contact keyboard
  navigation, validation focus, rapid Continue clicks, native date selection across
  a local/UTC day boundary, date reload/back preservation, damaged drafts, denied
  storage, narrow/short viewports, reduced motion, and the existing retry/success
  acknowledgement behavior.
- Initial restoration now renders the saved question directly, avoiding an
  unnecessary outgoing-screen animation that could leave the question area blank
  during reload. This was caught and corrected during browser verification.
- A shared-port test run lost its server connection; final checks used a copied
  production build on isolated port 3417. Temporary generated type files in that
  copy were excluded to avoid interfering with the repository's TypeScript scan.
  The final production build and checks passed after that test setup correction.
- Date-control screenshots were reviewed on the narrow layout. Keyboard resizing
  was simulated by resizing the browser viewport; real iOS/Android keyboard and
  native calendar-dialog testing remains a device QA task. No real client auth,
  live intake persistence, payments or domain routing was exercised.

Normal reproduction when the shared local test ports are free:

```sh
npm test
npm run typecheck
npm run lint
npm run test:e2e -- tests/e2e/quote.spec.ts tests/e2e/usability.quote.spec.ts
E2E_QUOTE_MODE=studio npx playwright test tests/e2e/quote.spec.ts --grep 'Studio pending mode'
```

## Adapter verification and changed files (2026-10-29)

Fixture-stage adapter verification (real paired results are in the linked report):

- **116 unit checks passed**, including the exact fixture/schema imported from the
  canonical implementation worktree, status/receipt validation, transport failures,
  concurrent identical request forwarding, conflicts, malformed/privileged input,
  UTF-8/chunked byte limits, rate controls, no legacy fallback and Production rejection.
- **20 new desktop/mobile browser fixture cases passed** for immutable retry/reload,
  conflict handling, explicit separate-request confirmation/archive, malformed receipt,
  429/413/422/503 failures, required phone, blocked storage and damaged attempt recovery.
- **16 existing quote cases and six synthetic gateway cases passed**; two Studio-pending
  boundary cases and two focused contact-keyboard cases also passed. The full unrelated
  presentation/usability suites were not rerun. Gateway configuration was not edited.
- Production build, TypeScript, ESLint and whitespace checks passed. The initial browser
  failures were ambiguous alert locators (Next's route announcer also has role=alert);
  tests now scope to the questionnaire. The legacy fixture expectation was updated for
  required phone. A lint run overlapped test-output cleanup and failed on a disappearing
  directory; its sequential rerun passed. No failing check is being represented as a pass.
- At that fixture stage, real Studio HTTP/database/action-queue verification was
  deferred. It is now completed locally as documented in
  [paired-adapter-verification.md](paired-adapter-verification.md). Physical-device,
  customer authentication, payment, hosted migration and deployed edge verification
  remain outstanding.

Files changed by this adapter task (other dirty-tree changes predate it):

| Purpose                                                | Files                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Facade, contract, mapping, release guard and transport | `src/app/api/quote/route.ts`, `src/lib/studio-intake.ts` (new), `src/lib/studio-intake-contract.ts` (new), `src/lib/quote-attempt.ts` (new), `src/lib/quote-request-guard.ts` (new), `src/lib/quote-intake.ts`                                                                                                                              |
| Retained browser attempt / required phone              | `src/components/quote/QuoteFlow.tsx`, `src/lib/quote.ts`                                                                                                                                                                                                                                                                                    |
| Test coverage and synthetic fixtures                   | `tests/unit/studio-intake.test.ts` (new), `tests/unit/studio-canonical.test.ts` (new), `tests/unit/studio-intake-fixture.ts` (new), `tests/e2e/intake.quote.spec.ts` (new), `tests/unit/fixtures.ts`, `tests/unit/quote-delivery.test.ts`, `tests/unit/quote-route.test.ts`, `tests/e2e/quote.spec.ts`, `tests/e2e/usability.quote.spec.ts` |
| Test isolation and configuration documentation         | `vitest.config.ts`, `playwright.config.ts`, `.env.example`, this document                                                                                                                                                                                                                                                                   |

Fixture reproduction, using the existing test ports only when free:

```sh
npm test
npm run typecheck
npm run lint
NEXT_DIST_DIR=.next-test STUDIO_ORIGIN=http://127.0.0.1:3299 npm run build
npx playwright test tests/e2e/intake.quote.spec.ts tests/e2e/quote.spec.ts tests/e2e/studio-routes.spec.ts --workers=2
E2E_QUOTE_MODE=studio npx playwright test tests/e2e/quote.spec.ts --grep 'Studio pending mode' --workers=2
```

These are the repository's synthetic test ports, not an assigned paired Studio
setup. Test startup clears the new upstream credentials and test-enable flag. Do not
reuse an unrelated running server; no paired ports should be guessed.

The preceding read-only presentation review is retained at
`build/presentation-review/claude-acceptance-handoff.md` with screenshots and a
physical-device checklist. It identifies compact-brand visibility, CTA movement,
normal-motion horizontal swipe, 320 × 568 hero framing and the no-account FAQ promise.
Those Claude-owned files were not edited. Legacy remains the live/default destination;
production Studio delivery remains blocked. No Studio files, existing lead records,
live settings, migrations, DNS or deployments were changed.
