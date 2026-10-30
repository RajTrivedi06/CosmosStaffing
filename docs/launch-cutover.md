# Launch cutover plan

**Status: for approval. Nothing here has been done, and production stays
blocked.** No step below is authorized until Raj approves it. DNS and domains
stay Raj's. Written 2026-10-30.

## What launches

| In                                       | Out, by decision                                 |
| ---------------------------------------- | ------------------------------------------------ |
| Client accounts, with email confirmation | Online payment: Cosmos arranges payment directly |
| Quote requests delivered to the Studio   | Self-service email change                        |
| Customer history in the account          | Typed-code recovery: the emailed link stays      |
| Password recovery by emailed link        | A separate password-change screen                |

Uncertain submissions keep the current safeguard. Support follows
[support-uncertain-requests.md](support-uncertain-requests.md).

## Versions

- **Website:** the commit that added this file, on `feat/cosmos-staffing-site`.
  Its last paired run was on `d234192`; later commits haven't been paired yet.
- **Studio:** `ee9146e` on `feat/customer-auth-foundation`, plus the Production
  guard change in gate 2. Migrations `20261030010000_customer_accounts.sql` and
  `20261030020000_customer_service_auth_errors.sql`, after any earlier ones the
  production ledger is missing.

## Gates before cutover

Each must be closed before step 1. "Unverified" means nobody has checked it.

### 1. Needed from Raj

- [ ] Company **phone, email and office hours**. None are recorded anywhere; the
      Contact page shows placeholders, and the uncertain-request screen sends
      customers there. **This blocks launch.**
- [ ] The remaining site placeholders: what to do with each unconfirmed claim
      (reviews and ratings, insurance and background checks, re-clean and
      cancellation policies, reply time).
- [ ] Whether the release includes the uncommitted presentation work (hero,
      services reel, images). It isn't in the candidate.
- [ ] Vercel access for whoever performs the deployment. The CLI here isn't
      signed in, so what production serves today is unverified.

### 2. Studio (integration lead)

- [ ] A reviewed change lifting the Production guard in `customerApiEnabled`,
      off until set, like the website's.
- [ ] An upgrade rehearsal from the real migration ledger, not a fresh database.
- [ ] The ledger reconciled. If `20261029020000` isn't applied, it needs the
      invitation maintenance window in `website-studio-rollout.md`.
- [ ] A recoverable backup or PITR point confirmed, with an owner.
- [ ] Staff told not to issue payment links. `/pay` stays forwarded, so a link
      that's issued still works and reaches Stripe, which is unverified.
- [ ] A named person with read-only production database access for the support
      lookup. A reference lookup inside the Studio would be better, but isn't
      needed for launch.

### 3. Verification still owed

- [ ] A new paired reservation: the full suite against a **production build** of
      the website candidate. The 44 passes on `d234192` used `next dev`, and
      later commits changed password and payment behaviour.
- [ ] Protected Preview, on an isolated project: edge caching, cookies, Server
      Actions and `/q` forwarding on the real edge.
- [ ] Cleaner and staff regression on the shared project.
- [ ] A physical phone, once. Results so far use Pixel 7 emulation.

### 4. Hosted setup (reviewed, not yet applied)

- [ ] Auth redirect URLs: add `https://cosmosservicesllc.com/account/confirm**`.
      Keep the existing entries.
- [ ] Email templates for Confirm signup and Reset password. They branch on the
      customer prefix `https://cosmosservicesllc.com/account/confirm?next=`, and
      everything else keeps `.ConfirmationURL`, so staff and cleaner email
      doesn't change. Slot-5 and slot-4 proved this locally.
- [ ] Custom SMTP, with sender and SPF/DKIM. The built-in sender is limited to a
      few emails an hour.
- [ ] Rate limits on `/account/*` and `/api/quote` (Vercel WAF), and which
      forwarded-IP headers are trusted. The website's own limiter is per process.

## Cutover steps

Rehearse this list on the isolated project first. Stop at the first failure and
use Recovery.

| #   | Step                                                                                                                                                                           | Owner            | Check before moving on                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | ------------------------------------------------------- |
| 1   | Raj approves this plan with pinned commits. Merge both branches. Freeze other deployments.                                                                                     | Raj              | Commits recorded                                        |
| 2   | Take and record the recovery point.                                                                                                                                            | Integration lead | Backup confirmed restorable                             |
| 3   | Apply hosted Auth settings from gate 4.                                                                                                                                        | Integration lead | Staff login, staff reset and cleaner OTP unchanged      |
| 4   | Quiesce customer intake and quote or payment reads and actions on every ingress. Let in-flight requests settle. Keep Stripe's webhook running.                                 | Integration lead | Traffic stopped                                         |
| 5   | Apply only the reviewed migrations.                                                                                                                                            | Integration lead | Ledger, signatures and schema visibility, read-only     |
| 6   | Deploy the matching Studio. Set `CUSTOMER_API_ENABLED`, the production switch from gate 2 and `WEBSITE_INTAKE_SECRET`; set the matching hash with `set_website_intake_secret`. | Integration lead | Wrong credential returns `503 service_auth_failed`      |
| 7   | Set website Production variables (below) with the switch **off**. Deploy the pinned commit.                                                                                    | Website owner    | `/quote` says sending isn't open, and nothing sends     |
| 8   | Raj assigns domains, if they aren't already in place. Do not attach the apex to the Studio.                                                                                    | Raj              | Gateway paths reach the Studio, staff routes don't      |
| 9   | **Second approval from Raj.** Set `CUSTOMER_API_PRODUCTION_ENABLED=true`, redeploy.                                                                                            | Raj, then owner  | Below                                                   |
| 10  | Run the smoke test with an account Raj authorizes. Production writes need that approval.                                                                                       | Both             | All pass                                                |
| 11  | Reopen. Watch sanitized errors for the first hours, without logging URLs or payloads.                                                                                          | Both             | No rejected sessions or delivery failures beyond normal |

### Website Production variables

Names only. Values stay in Vercel.

| Variable                          | Value                                                  |
| --------------------------------- | ------------------------------------------------------ |
| `QUOTE_DELIVERY_MODE`             | `customer`                                             |
| `CUSTOMER_API_PRODUCTION_ENABLED` | `true` only at step 9                                  |
| `STUDIO_CUSTOMER_API_URL`         | `https://studio.cosmosservicesllc.com/api/customer/v2` |
| `WEBSITE_INTAKE_SECRET`           | Server only, matching the Studio                       |
| `AUTH_SUPABASE_URL`               | The Studio's project                                   |
| `AUTH_SUPABASE_PUBLISHABLE_KEY`   | Publishable key only                                   |
| `NEXT_PUBLIC_SITE_URL`            | `https://cosmosservicesllc.com`                        |

Never set `QUOTE_STUDIO_TEST_ENABLED`, or a service-role key, in Production.

### Smoke test

1. Sign up with the authorized address. The email arrives, and its link lands
   signed in, without a second sign-in.
2. Answer the first questions signed out, sign up, adopt them, finish and send.
3. The request appears in the Studio queue, and in the account's history.
4. Sign out, sign in with only the password, and confirm there's no email code.
5. Use "Forgot your password?". The link works, and this also confirms hosted
   Auth marks that link the way the password rule expects. If the reset page
   says a link is required straight after using one, stop: recovery is broken.
6. A second account sees none of the first's records.
7. An open payment reads "We'll arrange payment with you directly", with no
   link.
8. The staff and cleaner logins still work.

## Recovery

| Failure                           | Do this                                                                                                                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Before migrations                 | Abort. Restore the prior controls and reopen on the old pair.                                                                                                                      |
| A migration fails                 | Keep traffic stopped. Inspect the ledger; don't assume it rolled back.                                                                                                             |
| After migrations, an app fails    | Forward-fix or deploy a compatible build, with customer traffic stopped. Never restore anonymous quote or payment access, or drop bindings or receipts.                            |
| After step 9, delivery misbehaves | Unset `CUSTOMER_API_PRODUCTION_ENABLED` and redeploy. `/quote` then says sending isn't open and nothing is lost. Customers' accounts stay; account history reads as not connected. |
| Wrong credential after step 6     | Fix the secret on both sides. Customers see temporary unavailability and keep their attempts.                                                                                      |
| Database recovery                 | Restore to an isolated target first, and reconcile every later write under a separately approved plan.                                                                             |

Unsetting the switch doesn't bring back the old inbox. Going back to
`QUOTE_DELIVERY_MODE=legacy` needs `AUTH_SUPABASE_*` unset too, and depends on
the legacy inbox still being configured in Production, which is unverified.

## Approvals requested

1. This plan and its pinned commits.
2. Applying the hosted Auth settings and SMTP.
3. The migrations, in a window you choose.
4. Domains or DNS, if needed. These stay yours to perform.
5. Separately, at step 9, turning production delivery on.
