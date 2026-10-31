# Launch cutover: the website's part

**Status: for approval. Nothing here has been done, and production stays
blocked.** The canonical plan is the Studio's
`docs/03-guides/launch-2026-10-30.md` (branch `feat/launch-readiness-20261030`,
commit `961d519`), and it governs if the two ever differ. This file adds only
what the website does. No step is authorized until Raj approves it.

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
- DNS: Wix nameservers, with the apex and `www` on Wix and `studio` on Vercel.

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

**Still on the site. Please check these are accurate:**

- What each service typically includes, and the example kitchen list. The
  Services page heads these "Typically includes", and quotes set the real scope.
- Larger or unusual jobs may get a walkthrough first.
- Coordinating cleaning providers elsewhere in Texas and across the US.
- Cleaner payment methods: the questionnaire offers Zelle, Cash App, Venmo or
  check, from the Studio's onboarding document.

**Blocks the release steps, from the canonical plan:**

- [ ] Confirm the Vercel team and projects, and give the deploying owner access.
      The CLI on this machine isn't signed in.
- [ ] An isolated hosted Preview, and acceptance of its cost.
- [ ] Controlled test mail recipients, and the SMTP sender.
- [ ] The WAF budget and cost.
- [ ] A maintenance window and a DNS operator.
- [ ] Who verifies customers for support, and who holds the read-only lookup.

## Verification still owed

- [ ] Website Codex's review of this candidate.
- [ ] A fresh paired reservation from Internal Tools, then the full suite against
      a **production build** of this candidate. The 44 passes on `d234192` used
      `next dev`, and later commits changed password, payment and error
      behaviour. Studio's own `961d519` is new too.
- [ ] Protected Preview: cookies, Server Actions, native POST, caching and `/q`
      forwarding on the real edge, plus the 429 screens under the real WAF rule.
- [ ] Cleaner and staff regression on the shared project.
- [ ] A physical phone, once.

## Website steps in the canonical order

**Don't merge to `main` until deployment control is in place.** A merge to
`main` can auto-deploy, which would put schema-dependent code live before
maintenance and migrations. Before any merge, record each project's actual
deployment trigger and how it's being held, or leave the merge until the
approved deployment step. Changing a hosted setting needs its own approval.

Payments depend on the Studio's `CUSTOMER_CHECKOUT_ENABLED` staying off on every
checkout path, with signed webhooks still running. The website hiding its `Pay`
link isn't enough on its own, because `/pay` stays forwarded.

| Canonical step           | What the website does                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Isolated Preview      | Build this commit with `QUOTE_STUDIO_TEST_ENABLED=true`, Preview credentials and the Preview origin. Run the checks above.                                          |
| 2. Prepare recovery      | Record the current deployment and effective variables.                                                                                                              |
| 3. Quiesce               | Keep the current site up. Website signup and intake aren't live yet, so there's nothing to drain.                                                                   |
| 4. Migrations            | Nothing. The Studio applies them.                                                                                                                                   |
| 5. Auth, SMTP, templates | Confirm the production callback prefix against `/account/confirm`. The Studio applies them.                                                                         |
| 6. Stage artifacts       | Set Production variables with the switch **unset**, then `vercel deploy --prod --skip-domain`. Record the deployment. Inspect it: `/quote` says sending isn't open. |
| 7. Production enablement | **Separate approval.** Set `CUSTOMER_API_PRODUCTION_ENABLED=true` and rebuild, together with the Studio's reviewed change.                                          |
| 8. DNS                   | Raj or the DNS operator changes only the apex and `www`, to the values Vercel gives. Mail records stay byte for byte.                                               |
| 9. Live smoke test       | Run the smoke test below with approved accounts.                                                                                                                    |
| 10. Recover if needed    | See Recovery.                                                                                                                                                       |

### Website Production variables

Names only. Values stay in Vercel.

| Variable                          | Value                                                  |
| --------------------------------- | ------------------------------------------------------ |
| `QUOTE_DELIVERY_MODE`             | `customer`                                             |
| `CUSTOMER_API_PRODUCTION_ENABLED` | Unset until step 7, then `true`                        |
| `STUDIO_CUSTOMER_API_URL`         | `https://studio.cosmosservicesllc.com/api/customer/v2` |
| `STUDIO_ORIGIN`                   | `https://studio.cosmosservicesllc.com`                 |
| `WEBSITE_INTAKE_SECRET`           | Server only, matching the Studio                       |
| `AUTH_SUPABASE_URL`               | The Studio's production project                        |
| `AUTH_SUPABASE_PUBLISHABLE_KEY`   | Publishable key only                                   |
| `NEXT_PUBLIC_SITE_URL`            | `https://cosmosservicesllc.com`                        |

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

## Recovery

| Failure                          | Do this                                                                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Delivery misbehaves after step 7 | Unset `CUSTOMER_API_PRODUCTION_ENABLED` and redeploy. `/quote` says sending isn't open, and history reads as not connected. Nothing is lost. |
| A wrong server credential        | Fix the secret on both sides. Customers see temporary unavailability and keep their attempts.                                                |
| The website itself fails         | Redeploy the recorded artifact, or revert the website's DNS records to their saved values. Leave mail records alone.                         |
| Anything after the migrations    | Use a compatible app or a forward fix. Never restore anonymous quote or payment access, or drop bindings or receipts.                        |

Unsetting the switch doesn't bring back the old inbox. Going back to
`QUOTE_DELIVERY_MODE=legacy` also needs `AUTH_SUPABASE_*` unset, and depends on
the legacy inbox still being configured in Production, which is unverified.
