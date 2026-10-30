# Real local website–Studio adapter verification

Completed 2026-10-29. Website working tree based on `6c21533`; existing unrelated
changes preserved. Studio running build `3fa253c`, including intake implementation
`c456d95`; `8f132f1` adds progress documentation only. The canonical contract is
unchanged. This run used the assigned lease in Studio
`docs/agent-temp/paired-adapter-local/HANDOFF.md`, not the original Studio checkout.

## Environment and boundaries

- Website: `http://localhost:3310`; Studio: `http://127.0.0.1:3311`.
- Isolated Supabase: `http://127.0.0.1:54721`, database port 54722, project
  `operations-studio-test-slot3`; 27 migrations through `20261029020000`.
- Loaded configuration was checked without displaying its secret:
  `QUOTE_DELIVERY_MODE=studio`, `QUOTE_STUDIO_TEST_ENABLED=true`, exact isolated
  intake URL and gateway origin. Legacy database/email credentials were empty.
- Only synthetic data was submitted. Database inspection used read-only
  transactions in the assigned container. No schema, migrations, Studio files,
  real messages, hosted credentials, live configuration or other databases changed.
- Browser customer authentication remained blocked. Server API calls used the
  explicitly authorized isolated pending-identity gate; they do not establish a
  complete authenticated browser journey.

## Real paired results

| Check                                 | Result and evidence                                                                                                                                                                                                               |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Concurrent first submission           | Two identical POSTs through website `/api/quote` returned **202 and 200**, with the same committed receipt.                                                                                                                       |
| Identical subsequent retry            | **200**, same receipt.                                                                                                                                                                                                            |
| Changed content under that UUID       | **409 idempotency_conflict**, no extra records.                                                                                                                                                                                   |
| Persistence                           | Exactly one new client, property, lead, job, non-current scope and receipt. Stored envelope/answers matched the mapped synthetic questionnaire exactly. `current_scope_id` stayed null.                                           |
| Staff queue and answers               | Logged into the actual Studio with the local seed account. **Review website inquiry · Paired Adapter Synthetic** was visible; the job showed the submitted size, contact and notes. No quote, booking or payment was fabricated.  |
| Required phone                        | Empty phone returned **422** at the website, preserving its stricter requirement.                                                                                                                                                 |
| Public facade validation              | Invalid JSON **400**, oversized multibyte body **413**, asserted privileged identity **422**, cross-site origin **403**, wrong media type **415**. Instrumentation observed no upstream calls for these rejected requests.        |
| Rate control                          | Sixth attempt returned **429** with `Retry-After: 600`. This proves only the per-instance local limiter. Website-only restarts separated test batches; this was not a distributed limiter test.                                   |
| No legacy fallback                    | Legacy credentials were empty throughout. The instrumented failure/validation run observed zero calls to legacy storage or email. Studio mode retained its single-destination branch.                                             |
| Browser boundary and retained attempt | At 390 × 844, client sign-in/final submission remained disabled with zero browser submissions. A retained original attempt survived reload and an incoming different-service URL without changing its UUID/answers.               |
| Production rejection                  | Restarted only the local website with `VERCEL_ENV=production`, leaving its test flag/secret present. POST returned **503 studio_pending**, no upstream call, no-store. This is a local guard check, not a hosted production test. |

## Controlled failures after actual persistence

A temporary website-process fetch probe under ignored `build/paired-adapter-review`
called the **real Studio**, then injected a failure after receiving its committed
response. No application source or Studio process was changed for injection.

1. **Malformed acknowledgment:** replace the committed response with `{ok:true}`.
   Website returned **502 delivery_failed**. Read-only DB inspection confirmed the
   commit. Retrying the exact retained request returned **200** and its original
   receipt; one record chain remained.
2. **Lost response:** throw a transport exception after consuming the real committed
   response. Website returned **502 delivery_failed**. The same UUID/answers retried
   successfully with the original receipt and no duplicates.
3. **Unauthorized upstream:** substitute a deliberately wrong synthetic credential
   for one outgoing call. Real Studio returned 401; website mapped it to
   **503 unavailable** without exposing details or creating records.

The fault probe models malformed/lost responses; it is **not** a claim that Studio
naturally emitted malformed output or suffered an outage. The API harness retained
immutable attempts on disk. Product browser error/retry handling remains covered
by the prior fixture cases because authentication intentionally prevents this
browser from initiating real submissions. No client-auth bypass was added.

## Real local gateway results

- `/me` redirects to `http://localhost:3310/me/login`; no staff-origin escape.
- `/me/login` and `/terms` render through the website. Synthetic nonexistent
  `/join`, `/q`, `/o`, `/pay` tokens reach Studio's failure pages, not website-owned
  replacements. No valid invitation, quote acceptance, offer response or payment
  transaction was exercised in this run.
- Sixteen Studio asset responses loaded successfully from the website's
  `/studio-assets/_next/static/` namespace.
- A real cleaner-login Server Action POST through the gateway returned its invalid
  phone validation, retained the website origin, and sent no SMS. No page errors
  were recorded. Successful OTP/session/cookie behavior remains unverified here.
- `/login`, `/people`, and `/api/webhooks/website` on the website returned 404;
  no broad staff/API rewrite was introduced.
- Token/portal responses retained no-store, noindex, no-referrer, CSP and frame
  protections. CDN-specific headers from `vercel.json` are not applied by local
  Next development serving; their effective Preview/edge behavior still needs
  verification. Public `/terms` is cacheable and outside the token/portal rule.

## Differences from fixture-only results / launcher handoff

No website adapter or Studio application defect was reproduced. Real persistence,
queue visibility, transaction deduplication and an actual public Server Action are
now verified locally, rather than inferred from fixtures.

One operational launcher defect occurred:

- **Reproduction:** run the supplied `start-website.py` against this npm-managed
  checkout, as instructed. Its final command is `pnpm exec next dev ...`.
- **Expected:** start the website with the provided isolated environment.
- **Observed:** this installed pnpm automatically attempted dependency installation,
  moved npm-managed packages, generated pnpm lock/workspace files, then failed with
  `ERR_PNPM_IGNORED_BUILDS` for `unrs-resolver`; no website listener started.
- **Website recovery:** restored dependencies from the existing npm lock with
  `npm ci --ignore-scripts`; removed only the newly generated pnpm files from the
  source tree (retained under ignored artifacts). A website-local copy preserved
  the launcher's environment loading/masking and reservation protocol, but invoked
  `node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 -p 3310` directly.
- **Handoff suggestion:** have the Studio-owned launcher invoke the existing local
  Next executable, or respect the website's package manager without an implicit
  install. The original Studio launcher was not edited.

## Evidence, cleanup and remaining dependencies

Sanitized evidence and reproducible local scripts are in ignored
`build/paired-adapter-review/`: `real-api-results.json`, `real-fault-results.json`,
`validation-results.json`, `production-guard-results.json`, `gateway-results.json`,
`browser-results.json`, and screenshots `studio-action-queue.png`,
`studio-job-answers.png`, `website-auth-blocked.png`,
`retained-attempt-auth-blocked.png`, `gateway-cleaner-validation.png`.
No secret, cookie or staff session is stored in these reports.

The database retains **three new synthetic inquiries** from this run, plus the
Studio owner's one readiness inquiry: four client/property/lead/job/scope/receipt
chains total. Nothing was deleted. The website process is stopped; its dedicated
`.next-paired-adapter-3310` output was removed and Next's generated type/config
changes were restored without discarding prior work. Studio and its database remain
running under the integration lead's lease. **They need not remain running for these
completed checks; only the Studio owner should perform the coordinated teardown.**

Still required before release: customer sign-in/recovery and verified client binding;
identity-aware retries and cross-auth draft recovery; shared distributed abuse/rate
controls; protected paired Preview with real edge caching/headers, cookies and
Server Actions; real OTP and separately authorized valid token/payment checks;
legacy-record reconciliation and explicit single-destination cutover; coordinated
migration/application rollout and separate deployment authorization. Production
pending-identity intake remains blocked. No deployment was performed.
