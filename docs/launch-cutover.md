# Launch cutover: the website's part

**Status: for approval. Nothing here has been done, and production stays
blocked.** The canonical plan is the Studio's
`docs/03-guides/launch-2026-10-30.md` (branch `feat/launch-readiness-20261030`,
commit `961d519`), and it governs if the two ever differ. This file adds only
what the website does. No step is authorized until Raj approves it.

Open work and owners are tracked in the Studio's
`docs/03-guides/release-morning-2026-10-31.md`.

## What launches

| In                                       | Out, by decision                                 |
| ---------------------------------------- | ------------------------------------------------ |
| Client accounts, with email confirmation | Online payment: Cosmos arranges payment directly |
| Quote requests delivered to the Studio   | Self-service email change                        |
| Customer history in the account          | Typed-code recovery: the emailed link stays      |
| Password recovery by emailed link        | A separate password-change screen                |

Support for uncertain submissions: see
[support-uncertain-requests.md](support-uncertain-requests.md).

## Where things stand

From the Studio's read-only checks, which can drift, so recheck at cutover:

- Production database: four migrations pending, zero business records.
- Hosted Auth: no customer redirect, no customer templates, no SMTP, and a
  built-in email limit of 2 an hour.
- Website project `cosmosstaffing`: its last Production deployment is
  `527e2c9`, from June. Nothing from this branch is deployed.
- DNS for `cosmosservicesllc.com`: Wix nameservers, with the apex and `www` on Wix
  and `studio` on Vercel. For `cosmosgroupusa.com`: Hostinger parking nameservers, with
  no `studio` record.

## Needed from Raj

**Blocks launch: real Terms of Service.** The Studio's `/terms` page says "final
text coming soon", but customers must tick "agree to the Terms of Service" to
accept a quote on `/q`. Either publish real terms or change that step. The
website no longer links to `/terms` or describes what the terms cover. `/terms`
stays forwarded, because the Studio's quote pages link to it.

**Held off the site until there's a confirmed policy.** None of this is public.
To publish any of it, confirm the policy, then add the wording.

| Topic              | What was removed                                                                                                                                                                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Insurance          | "Insured", the FAQ, "You don't need your own insurance to apply", and what company insurance covers for cleaners                                                                                                                                                |
| Re-clean           | "We come back free", and "If anything was missed... we will put it right"                                                                                                                                                                                       |
| Cancellation       | "Can I pause or cancel?", and the description of what the terms cover                                                                                                                                                                                           |
| Cleaner assignment | "Same team, every visit", the FAQ, "A team your staff will recognise", and "Meet your team"                                                                                                                                                                     |
| Supplies           | "Do you bring supplies?", and "Products chosen for each material"                                                                                                                                                                                               |
| Cleaner pay        | Pay rates, how much work to expect, and payout timing and process                                                                                                                                                                                               |
| Scheduling         | "A schedule that runs itself", and "Set it up once. Then it runs itself."                                                                                                                                                                                       |
| Other promises     | "One contact, one invoice", one point of contact, a note after each visit, "trained, fairly paid", "1 of 8 rooms", the written standard and per-room checklists, "Notes kept for every home", "We ask before moving anything precious", and restocked restrooms |
| Trust claims       | "Trusted", and "Many clients share a key or door code"                                                                                                                                                                                                          |

**No public claim is waiting on Raj's confirmation.**

Decided by Raj on October 31: weekly, every-two-weeks and monthly cleaning are
frequencies customers can request; Cosmos confirms the scope, location and schedule
in the quote; recruitment describes the independent-cleaner opportunity and
agreement; service lists use U.S. wording and are examples of what a cleaning can
include. Oven and refrigerator interiors, interior windows and move-out checklist
items are tasks customers can request and Cosmos must confirm. Studio's quote
doesn't itemize tasks, so the site says "Tell us which tasks matter to you. Our team
will confirm what's included before scheduling." Cleaner SMS sign-in stays off the site until the hosted flow is verified:
then set `cleaners.signIn.available` in `src/lib/site.ts`, which publishes the link,
the note and the step together.

Austin, Houston, San Antonio, Dallas and coordination elsewhere in the US come from
the project brief, and are treated as confirmed.

**Contact, decided by Raj:** email only, `info@cosmosservicesllc.com`, with no phone
numbers or hours. Cosmos handles support, scheduling and payment follow-up manually.

**Blocks the release steps, from the canonical plan:**

- [ ] Confirm the Vercel team and projects, and give the deploying owner access.
      The CLI on this machine isn't signed in.
- [ ] An isolated hosted Preview, and acceptance of its cost.
- [ ] Controlled test mail recipients, and the SMTP sender.
- [ ] The WAF budget and cost.
- [ ] A maintenance window and a DNS operator.
- [ ] Who verifies customers for support, and who holds the read-only lookup.

## Verification still owed

- [ ] Protected Preview: a native form POST, and the 429 screens under the real
      WAF rule. A native form's 429 needs a usable edge response; the React
      screen can't cover it. See item 2.8 in the release tracker.
- [ ] Cleaner and staff regression on the shared project.
- [ ] A physical iPhone and Android phone, once.
- [ ] A new paired reservation only if integration code changes. The production
      build passed 44 of 44 on `4d59821`; see the morning handoff.

## Website steps in the canonical order

**Don't merge to `main` until deployment control is in place.** A merge to
`main` can auto-deploy, which would put schema-dependent code live before
maintenance and migrations. Before any merge, record each project's actual
deployment trigger and how it's being held, or leave the merge until the
approved deployment step. Changing a hosted setting needs its own approval.

Payments depend on the Studio's `CUSTOMER_CHECKOUT_ENABLED` staying off on every
checkout path, with signed webhooks still running. The website hiding its `Pay`
link isn't enough on its own, because `/pay` stays forwarded.

| Canonical step           | What the website does                                                                                                                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Isolated Preview      | Build this commit with `QUOTE_STUDIO_TEST_ENABLED=true`, Preview credentials and the Preview origin. Run the checks above.                                                                                           |
| 2. Prepare recovery      | Record the current deployment and effective variables.                                                                                                                                                               |
| 3. Quiesce               | Keep the current site up. Website signup and intake aren't live yet, so there's nothing to drain.                                                                                                                    |
| 4. Migrations            | Nothing. The Studio applies them.                                                                                                                                                                                    |
| 5. Auth, SMTP, templates | Confirm the production callback prefix against `/account/confirm`. The Studio applies them.                                                                                                                          |
| 6. Stage artifacts       | Set Production variables with the switch **unset**, then `vercel deploy --prod --skip-domain`. Record the deployment. Inspect it: `/quote` says sending isn't open.                                                  |
| 7. Production enablement | **Separate approval.** Set `CUSTOMER_API_PRODUCTION_ENABLED=true` and rebuild, together with the Studio's reviewed change.                                                                                           |
| 8. DNS                   | On `cosmosgroupusa.com`, Raj or the DNS operator changes only the apex and `www`, to the values Vercel gives, plus `studio` if adopted. Mail records stay byte for byte. Nothing on `cosmosservicesllc.com` changes. |
| 9. Live smoke test       | Run the smoke test below with approved accounts.                                                                                                                                                                     |
| 10. Recover if needed    | See Recovery.                                                                                                                                                                                                        |

### Final-domain configuration

The website's domain is `cosmosgroupusa.com`, Raj's official domain, with
`studio.cosmosgroupusa.com` proposed for the Studio. An earlier version of this file
called `cosmosservicesllc.com` final. That was wrong. Keep `cosmosservicesllc.com` and
its email configuration in place during the transition.

| Setting                  | Value                                                                                           | State                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Vercel domains           | Apex primary. `www` redirects to the apex, keeping path and query                               | Not set. Session cookies are host-only, so serving both would split sign-in           |
| Studio domain            | `studio.cosmosgroupusa.com`, proposed                                                           | Doesn't resolve yet. The Studio stays on `studio.cosmosservicesllc.com` until it does |
| Auth Redirect URLs       | Add `https://cosmosgroupusa.com/account/confirm**`. Keep existing staff and cleaner entries     | Not set. No `www` entry is needed: email links always use `NEXT_PUBLIC_SITE_URL`      |
| Auth Site URL            | Stays the Studio's value                                                                        | Studio-owned                                                                          |
| Confirm and reset emails | `supabase/templates/` links, used only on the customer branch of the shared project's templates | Not set. Don't paste them in unbranched: other redirects have no query for the `&`    |
| Email sender             | None chosen                                                                                     | See below                                                                             |
| Support address          | `info@cosmosservicesllc.com`, on the Contact page and in the footer                             | Unchanged by decision. Who monitors it isn't confirmed, and it hasn't been tested     |

**During the transition,** Production's customer API accepts exactly the new or the
current Studio address. Both domains stay refused on every test and Preview path. When
the move is finished, remove `TRANSITION_STUDIO_ORIGIN` from `src/lib/studio-routes.ts`
and keep the old domain in `PRODUCTION_HOST`. What happens to the old domain's Wix site
isn't decided.

**Sender.** Public DNS, read November 2. `cosmosgroupusa.com` is on parking nameservers
with Outlook MX. Its SPF allows only Outlook and ends in `-all`, and it has no DMARC
record. `cosmosservicesllc.com` has the same SPF, and its DMARC is a CNAME to a
Wix-managed `p=none` policy. So a new sender on either domain needs an SPF change or its
own sending subdomain. DKIM selectors can't be fully listed from outside.

### Website Production variables

Names only. Values stay in Vercel.

| Variable                          | Value                                                                                                                                                     |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QUOTE_DELIVERY_MODE`             | `customer`                                                                                                                                                |
| `CUSTOMER_API_PRODUCTION_ENABLED` | Unset until step 7, then `true`                                                                                                                           |
| `STUDIO_CUSTOMER_API_URL`         | `https://studio.cosmosservicesllc.com/api/customer/v2` until `studio.cosmosgroupusa.com` is live, then its address                                        |
| `STUDIO_ORIGIN`                   | `https://studio.cosmosservicesllc.com` until `studio.cosmosgroupusa.com` is live. **Must be set:** the default is the new host, which doesn't resolve yet |
| `WEBSITE_INTAKE_SECRET`           | Server only, matching the Studio                                                                                                                          |
| `AUTH_SUPABASE_URL`               | The Studio's production project                                                                                                                           |
| `AUTH_SUPABASE_PUBLISHABLE_KEY`   | Publishable key only                                                                                                                                      |
| `NEXT_PUBLIC_SITE_URL`            | `https://cosmosgroupusa.com`                                                                                                                              |
| `TURNSTILE_SITE_KEY`              | The production Turnstile widget's site key (public). Set it at step 6, before CAPTCHA is turned on in Supabase. The widget must list `cosmosgroupusa.com` |

Never set `QUOTE_STUDIO_TEST_ENABLED`, or a service-role key, in Production.
Delivery needs the Studio's guard lifted as well: this switch alone sends
nothing.

### Smoke test, website part

1. Sign up with an approved address. The email arrives, and its link lands
   signed in, without a second sign-in.
2. Answer the first questions signed out, sign up, adopt them, finish and send.
3. The request appears in the Studio queue, and in the account's history.
4. Sign out, then sign in with only the password. No email code is asked for.
5. Use "Forgot your password?". **If the reset page asks for a link straight
   after using one, stop:** it means hosted Auth marks links differently from the
   local stack, and recovery is broken.
6. The Contact page's email link reaches someone at Cosmos.
7. An approved second account sees none of the first's records.
8. An open payment reads "We'll arrange payment with you directly", with no link.
9. A deliberately blocked form shows the 429 screen, and nothing resends.
10. `https://www.` plus a path and query lands on the same path on the apex.
11. Canonical tags, `sitemap.xml` and an email link all use the final domain.
12. With CAPTCHA on, the sign-in, sign-up and reset forms enable their buttons
    and show no security-check message. Step 4 then still signs in.

## Recovery

| Failure                          | Do this                                                                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Delivery misbehaves after step 7 | Unset `CUSTOMER_API_PRODUCTION_ENABLED` and redeploy. `/quote` says sending isn't open, and history reads as not connected. Nothing is lost. |
| Forms show the security check    | Turn CAPTCHA off in the Supabase project; the forms work either way. Then check the site key and the widget's hostnames.                     |
| A wrong server credential        | Fix the secret on both sides. Customers see temporary unavailability and keep their attempts.                                                |
| The website itself fails         | Redeploy the recorded artifact, or revert the website's DNS records to their saved values. Leave mail records alone.                         |
| Anything after the migrations    | Use a compatible app or a forward fix. Never restore anonymous quote or payment access, or drop bindings or receipts.                        |

Unsetting the switch doesn't bring back the old inbox. Going back to
`QUOTE_DELIVERY_MODE=legacy` also needs `AUTH_SUPABASE_*` unset, and depends on
the legacy inbox still being configured in Production, which is unverified.
