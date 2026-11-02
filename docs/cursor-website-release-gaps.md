# Website release gaps — Cursor audit

Read-only. November 2, 2026. Written in isolated worktree
`/Users/raaj/Documents/CS/cosmos/wt-cursor-website-release-gaps` on branch
`docs/cursor-website-release-gaps`. No implementation, suite, credential, hosted
or deployment changes.

## Candidate confirmation

| Pin | Value |
| --- | --- |
| Website runtime (application) | `5c448893cf229a29dda2113e4de2caf8d7e3ec6a` |
| Website documentation pin | `af55acf1d784e00f9d0d2c79f12cf7bf7432f9f5` |
| Branch / presentation checkout | `presentation/candidate-2026-10-30` at `/Users/raaj/Documents/CS/cosmos/wt-website-presentation` |
| Runtime ↔ docs delta | `5c44889..af55acf` is documentation only (`claude-handoff-5c44889`, `claude-handoff-6bedecb` tweak, `claude-recipient-privacy-contract`). Application source is unchanged. |
| Canonical Studio checklist | `wt-integration-implementation/docs/03-guides/release-morning-2026-10-31.md` (five-section checklist; public production **NO-GO**) |
| Website cutover companion | `docs/launch-cutover.md` (defers to Studio `docs/03-guides/launch-2026-10-30.md` when they differ) |

**Verdict on candidate identity:** treat **`5c44889`** as the website runtime under assessment; **`af55acf`** is the matching docs pin. Older labels (`bb50858`, `5a0524f`, `6bedecb`) are superseded for runtime. This audit does **not** re-open Website Codex’s privacy review or Claude/Codex hosted privacy retests; those remain as recorded on the canonical checklist (Studio recipient P1 / `48a1085` focused retest separate).

**Scope of this document:** remaining website launch requirements for final domain references, support/contact links, public copy, production configuration, customer email journeys, and outstanding browser/device checks. Privacy and the active recipient hosted retest are named only as out-of-scope open items, not reassessed.

---

## Summary

Production remains **NO-GO**. For the scoped surfaces, public contact/copy are largely aligned with Raj’s October 31 decisions; the material blockers are production Auth/email/DNS configuration, real-inbox delivery, named support-lookup ownership, Terms (Studio-owned but launch-blocking), and physical-device / edge WAF proof. One small public-copy awkwardness remains in source.

| Kind | Count in this audit |
| --- | --- |
| Confirmed defects / blockers (scoped) | 4 |
| Missing verification (scoped) | 8 |
| Explicitly not reassessed | Privacy / recipient hosted retest; payments collection; cleaner SMS |

---

## Confirmed defects and blockers

### G1 — Production Terms of Service still block quote acceptance

| Field | Detail |
| --- | --- |
| Kind | Confirmed blocker (Studio-owned surface; website launch cannot complete without it) |
| Evidence | `docs/launch-cutover.md`: Studio `/terms` still “final text coming soon”; customers must tick Terms to accept on `/q`. Website no longer links to `/terms` or describes coverage, but still forwards `/terms`. Canonical checklist §3: client online acceptance deliberately paused until final versioned terms. |
| Next action | Publish approved immutable terms **or** change the acceptance step; keep acceptance default-closed until text/version and client display agree. |
| Owner | Internal Tools (Studio Terms / acceptance policy) |
| Raj decision | Supply final client Terms text/version, or approve a different acceptance step. |

### G2 — Production website environment is not configured for the launch variables

| Field | Detail |
| --- | --- |
| Kind | Confirmed configuration gap |
| Evidence | Canonical checklist §2 (November 1 metadata): website Vercel project had **0 configured variables**; Production tracks `main` with Auto-Assign Custom Production Domains enabled. `docs/launch-cutover.md` lists required Production names (`QUOTE_DELIVERY_MODE=customer`, unset-then-true `CUSTOMER_API_PRODUCTION_ENABLED`, `STUDIO_CUSTOMER_API_URL`, `STUDIO_ORIGIN`, `WEBSITE_INTAKE_SECRET`, `AUTH_SUPABASE_*`, `NEXT_PUBLIC_SITE_URL=https://cosmosservicesllc.com`) and forbids `QUOTE_STUDIO_TEST_ENABLED` / service-role keys in Production. Last recorded Production website deploy remains historical June `527e2c9` (cutover / morning handoff). |
| Next action | Before any merge/promote: record effective Production variables (names only), hold auto-deploy, stage unaliased artifact with switch **unset**, then separate enablement approval. |
| Owner | Internal Tools + deploying website owner |
| Raj decision | Confirm Vercel team/project access for the deploying owner; approve Production enablement as its own step (not implied by Preview). |

### G3 — No production transactional email sender; real-inbox delivery unproven

| Field | Detail |
| --- | --- |
| Kind | Confirmed blocker for public customer email journeys |
| Evidence | Canonical checklist §2: Raj confirmed no configured transactional SMTP for production; Mailtrap Email Sandbox used for **captured** Preview Auth only. Checklist explicitly separates “Customer email capture / protected journey” (done for Preview) from “Real-inbox email delivery before production” (SPF/DKIM/DMARC, domain authentication, provider abuse limits). Hosted customer report (`docs/codex-hosted-customer-20261101.md`) proves Mailtrap capture + confirmation/recovery on Preview, not Gmail/Outlook delivery. |
| Next action | Select and configure an approved production SMTP/sender; authenticate the sending domain; run controlled real-inbox confirmation and recovery; keep business MX/SPF/DKIM/DMARC byte-stable during website DNS cutover. |
| Owner | Raj + provider/domain operator; Internal Tools configures Auth SMTP/templates; Website Codex verifies journeys |
| Raj decision | Choose production sender/provider and approve any DNS/cost changes for mail auth (separate from apex/`www` website cutover). |

### G4 — Services page CTA still reads “Get a workplaces quote”

| Field | Detail |
| --- | --- |
| Kind | Confirmed public-copy defect (cosmetic; non-blocking alone) |
| Evidence | `src/app/(site)/services/page.tsx` builds `Get a {s.title.toLowerCase()} quote`. Service id `office` has `title: "Workplaces"` in `src/lib/site.ts`, so the button is **“Get a workplaces quote”**. Morning handoff (`docs/morning-handoff-2026-10-31.md`) already noted this as awkward and left it out of scope; home workplaces CTA was later corrected to “Get a workplace quote”, but the services-page generator was not. |
| Next action | Use an explicit CTA string (or singularize) for the office/workplaces service button; leave other service titles alone. |
| Owner | Website Claude |
| Raj decision | Optional: accept current wording, or prefer “Get a workplace quote” / “Get a workplaces cleaning quote”. |

---

## Missing verification

### V1 — Final public domain / DNS cutover not executed or rechecked

| Field | Detail |
| --- | --- |
| Kind | Missing verification |
| Evidence | Source defaults already use `https://cosmosservicesllc.com` and `https://studio.cosmosservicesllc.com` (`site.ts`, `studio-routes.ts`, `.env.example`, cutover table). Public DNS baseline still Wix nameservers with apex/`www` on Wix and `studio` on Vercel (`launch-cutover.md`, hosted-preview-acceptance snapshots). No approved apex/`www` change has been made. |
| Next action | At cutover: Raj/DNS operator changes **only** apex and `www` to Vercel values; leave mail records untouched; smoke canonical URLs, redirects, and OG/canonical tags against Production `NEXT_PUBLIC_SITE_URL`. |
| Owner | Raj or named DNS operator; Website Codex smoke after cutover |
| Raj decision | Name DNS operator; approve maintenance window and exact Vercel DNS targets. |

### V2 — Production Auth callbacks and customer email templates not verified on the real domain

| Field | Detail |
| --- | --- |
| Kind | Missing verification |
| Evidence | Cutover step 5 and launch plan require production callback prefix against `/account/confirm`, customer template branch for website origin, staff/cleaner fallback preserved. Preview used isolated Free project + Mailtrap; that does not prove production project settings on `cosmosservicesllc.com`. Historical hosted-Auth snapshot (SMTP unset, 2/hour built-in limit, missing customer template branch) is stale relative to Preview work and must be re-read before Production patching. |
| Next action | Re-read production Auth settings immediately before change; merge exact `https://cosmosservicesllc.com/account/confirm**` allowlist; verify confirmation and recovery templates for the customer prefix only. |
| Owner | Internal Tools; Website Codex verifies redemption on Production smoke |
| Raj decision | None beyond production Auth/SMTP approval in G3. |

### V3 — Contact email monitored path not proven end-to-end for launch smoke

| Field | Detail |
| --- | --- |
| Kind | Missing verification (copy/link itself is present) |
| Evidence | Contact page and footer use only `mailto:info@cosmosservicesllc.com` (`contact/page.tsx`, `SiteFooter.tsx`, `siteConfig.contact`). Raj decision recorded in `launch-cutover.md` / morning handoff: email only, no phone, no hours. Phone numbers absent from current `site.ts`. Cutover smoke item 6 still requires: “The Contact page’s email link reaches someone at Cosmos.” |
| Next action | From the Production (or final staged) site, send one approved test message to `info@cosmosservicesllc.com` and confirm human receipt/monitoring. |
| Owner | Raj / Cosmos support; Website Codex records smoke result |
| Raj decision | Confirm who monitors `info@` during and after launch. |

### V4 — Support investigation ownership / read-only receipt lookup unnamed

| Field | Detail |
| --- | --- |
| Kind | Missing verification / ownership |
| Evidence | `docs/support-uncertain-requests.md` requires an authorized Studio operator for `website_intake_receipts` lookup by reference, and says Internal Tools must confirm the supported lookup and who holds access before launch. `launch-cutover.md` “Needed from Raj”: who verifies customers for support, and who holds the read-only lookup. |
| Next action | Name the support verifier and the read-only DB lookup holder; dry-run one synthetic unresolved-marker investigation without revealing another owner’s row. |
| Owner | Internal Tools + Raj |
| Raj decision | Name the people/roles for support verification and lookup. |

### V5 — Real-inbox customer journeys after production SMTP (beyond Preview capture)

| Field | Detail |
| --- | --- |
| Kind | Missing verification (depends on G3) |
| Evidence | Preview passed captured signup confirmation, ordinary password login, recovery with session revocation, and two-account isolation on the protected pair (`codex-hosted-customer-20261101.md`; later privacy fixes at `5c44889` reused that Auth evidence). Checklist still requires controlled real-inbox delivery before production. One Preview observation remains unreconciled: B signup UI showed a resend rate-limit message while Codex did not press resend (`codex-hosted-customer-20261101.md`) — owner log reconciliation still owed if it recurs under production limits. |
| Next action | After G3: one approved real inbox for confirmation + recovery; prove login without re-verification; do not burn Preview’s send freeze for this. Reconcile any resend/rate-limit anomalies from provider logs. |
| Owner | Website Codex verification; Internal Tools provider config |
| Raj decision | Approve real test recipients (not production customers). |

### V6 — Physical iPhone and Android once

| Field | Detail |
| --- | --- |
| Kind | Missing verification |
| Evidence | Morning handoff, `launch-cutover.md`, hosted-preview-acceptance P2, and `codex-hosted-privacy-5c44889.md` coverage limits: only emulated phones (and desktop) so far. Local evidence covers swipe/pinch/navbar on emulators; hosted privacy explicitly claims no physical-phone pass. |
| Next action | One pass each on physical iOS Safari and Android Chrome: keyboard Next/Done, reachable controls, rotation, auth in another tab, reduced motion, retained answers, contact mailto. |
| Owner | Website Codex or Raj with Website Codex observing |
| Raj decision | Provide devices / timebox; none for scope. |

### V7 — Production / Preview edge WAF: native form 429 usable response

| Field | Detail |
| --- | --- |
| Kind | Missing verification |
| Evidence | `launch-review-057c356.md` and `hosted-preview-acceptance.md`: hydrated 429 can show the React boundary; a native full-document 429 shows whatever the edge returns — React `error.tsx` cannot cover it. Cutover and checklist still require deployed rules for quote POST and Auth actions, plus a usable edge body/recovery path. Not proven on the live edge for Production. |
| Next action | Under approved WAF/rule budget, force one native POST 429 on Preview then Production staging; confirm no false success / auto-resend and a recoverable message. |
| Owner | Internal Tools (rules) + Website Codex (UX check) |
| Raj decision | Approve WAF budget/cost if not already covered by existing Preview authorization. |

### V8 — Shared-project staff and cleaner browser regression still unpaid

| Field | Detail |
| --- | --- |
| Kind | Missing verification (website gateway / shared Auth; not a new website feature) |
| Evidence | Cutover “Verification still owed” and canonical checklist §5: staff refresh/login/recovery and cleaner invitation/SMS portal under the shared project remain unverified on hosted. Website correctly keeps cleaner sign-in unpublished (`cleaners.signIn.available: false`) until SMS is verified. |
| Next action | After Auth/SMS gates: staff session + customer denial of staff routes; cleaner flow only with consented phone / $2 cap — or keep cleaner entry unpublished at launch (already the default). |
| Owner | Internal Tools + cleaner-flow owner; Website Codex only for gateway cookie isolation |
| Raj decision | Whether cleaner public entry stays off at website launch (current default); SMS provider/consented phone if enabling. |

---

## Out of scope for this audit (still open elsewhere)

Do not treat silence here as closure.

| Item | Pointer |
| --- | --- |
| Studio `/q` `/pay` retained-document P1 and `48a1085` focused hosted retest | Canonical checklist §1; `docs/codex-hosted-recipient-ff2e90a.md`; `docs/codex-review-studio-48a1085.md`. Not reassessed. |
| Website account/questionnaire privacy at `5c44889` | Hosted executed cases passed per `docs/codex-hosted-privacy-5c44889.md`. Not repeated. |
| Card checkout / Stripe collection | Intentionally off; separate payments section of the checklist. |
| Policies held off the site (insurance, re-clean, cancellation, etc.) | `launch-cutover.md` — correctly unpublished; no public claim waiting on Raj. |

---

## Scoped surfaces that look ready (reuse, do not re-prove here)

| Surface | Evidence reused |
| --- | --- |
| Final domain **strings in website source** | Defaults and allowlists already `cosmosservicesllc.com` / `studio.cosmosservicesllc.com`; no `PLACEHOLDER` markers under `src/`. |
| Public contact links | Email-only `info@cosmosservicesllc.com`; no phone/hours in contact UI or `siteConfig.contact`. |
| Unconfirmed marketing promises | Removed or held per October 31 decisions; frequencies / U.S. task wording / recruitment independence recorded in cutover. |
| Generic account error wording | Prior P2 “That didn’t go through…” replaced with outcome-neutral “We couldn’t confirm the result” in `site.ts` (present on this pin). |
| Preview captured Auth happy path | Confirmation, intake, history, recovery, revocation, B isolation — `codex-hosted-customer-20261101.md` (runtime then `bb50858`; Auth evidence reused after privacy fixes). |

---

## Suggested order for remaining website launch work

1. Raj: Terms (G1) + production mail sender (G3) + support/DNS names (V1, V3, V4).
2. Internal Tools: Production env hold + variable staging (G2), Auth callbacks/templates (V2), WAF native 429 (V7).
3. Website Claude: workplaces CTA string (G4) if Raj wants it fixed before launch.
4. Website Codex: real-inbox journeys (V5), physical devices (V6), cutover smoke including contact mailto — after the above, without repeating closed privacy cases.
5. Keep production **NO-GO** until the canonical checklist’s non-website gates (migrations, recipient privacy closure, payments policy, explicit cutover approval) also clear.
