# Working-tree inventory for the prerequisite and authentication commits

Prepared 2026-10-30 by the Claude website session for website Codex. Branch
`feat/cosmos-staffing-site`, HEAD `6c21533`. **Nothing was staged, reset,
discarded or committed** while preparing this; the index still holds only the
four pre-existing staged deletions (section D).

Groups:

- **P1. Studio routing and recruitment (Claude, earlier session):** forwarded
  paths, headers, Clean with Cosmos, the `/terms` handover, and the test harness.
- **P2. Quote intake (other session / website Codex):** retained attempts,
  Studio v1 adapter, request guard, and usability.
- **A. Client authentication (Claude, this session).**
- **U. Unrelated presentation (Claude, earlier session):** hero imagery, scroll
  scenes and the services reel.

P1 + P2 make up the prerequisite commit. A depends on both (see "Overlaps").
U is independent of A.

## A. Authentication, wholly new files (commit as they are)

| File                                                                                                         | Notes                                                                   |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `src/proxy.ts`                                                                                               | Session refresh on `/account*`, `/quote`, `/api/quote` only             |
| `src/lib/account/{config,destination,server,records}.ts`                                                     | Config/cookies, return-path allowlist, server client, display shape     |
| `src/app/account/{layout,page,actions}.tsx/ts`, `login/`, `signup/`, `forgot/`, `reset/`, `confirm/route.ts` | Pages, Server Actions, token-hash callback                              |
| `src/components/account/{AuthForms,SignOutButton,AccountNotes,AccountOverview,ContinueTo}.tsx`               | UI                                                                      |
| `src/lib/quote-handoff.ts`                                                                                   | **Imports P2's `src/lib/quote-draft.ts`**                               |
| `supabase/templates/{confirmation,recovery}.html`                                                            | Local test templates (shared-project templates need coordinated review) |
| `tests/unit/account.test.ts`                                                                                 | Imports `tests/unit/fixtures.ts` (P2-modified)                          |
| `tests/e2e/account.auth.spec.ts`                                                                             | Needs P1's Studio stub and rewrites for its `/q/<token>` case           |
| `docs/client-accounts.md`                                                                                    | Design, requirements, configuration                                     |
| `docs/commit-inventory-2026-10-30.md`                                                                        | This file                                                               |

## A. Authentication hunks inside shared files

| File                                 | Auth hunks (everything else in the file belongs to the group named)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Other owners                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `src/components/quote/QuoteFlow.tsx` | Imports `account as accountCopy` and `quoteHandoff`; `Status` adds `"signin"`; props `accountsOn`/`account` and their doc; draft restore falls back to `quoteHandoff.load()`; effect deps `[accountsOn]`; `needsAccount` and `leaveToSignIn`; `send()` guard adds `needsAccount`; `quoteHandoff.clear()` on success; `sign_in_required` → `"signin"`; studio-pending copy `accountsOn ? … : …`; "Create an account to send" panel and "Sending as"; review button swapped for Sign in / Create account links; `QuoteTop({signedIn})` and its 2 call sites; sent screen "Back to my account" | **P2** (most of the file)           |
| `src/app/api/quote/route.ts`         | Import `clientSession`; `sameOrigin()` helper and its use in the Origin check; the `sign_in_required` 401 block after the media-type check                                                                                                                                                                                                                                                                                                                                                                                                                                                  | **P2** (rest)                       |
| `src/app/quote/page.tsx`             | Import `clientSession`; `session` and the `accountsOn`/`account` props                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | **P2** (`connection`, `intakeMode`) |
| `src/lib/site.ts`                    | Footer line `{ label: "Client sign-in", href: "/account" }`; the whole `export const account = {…}` at the end of the file                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | P1, U                               |
| `src/components/layout/SiteNav.tsx`  | `account` in the site import; the `account.signInLabel` link at the top of `.sheet-more`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | P1 (`.sheet-more` itself)           |
| `src/app/globals.css`                | Block from `/* Review step without an account` through `.account-item-title {…}`, including "Full-width buttons keep their label centred", just before `/* ---- Content pages`                                                                                                                                                                                                                                                                                                                                                                                                              | P1, P2, U                           |
| `next.config.ts`                     | The `headers()` block for `/account` and `/account/:path*`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | P1 (`distDir`, rewrites)            |
| `playwright.config.ts`               | `execFileSync` import; `AUTH_PORT`, `AUTH_E2E`, `localAuthKey`, `NO_ACCOUNTS`; the `auth-desktop` and `auth-mobile` projects; `.auth` in desktop `testIgnore`; `...NO_ACCOUNTS` in the main server env; the 3201 auth webServer (sets `VERCEL: "1"`, test only). `QUIET_DELIVERY` only hoists P2's existing env list into a constant                                                                                                                                                                                                                                                        | P1 (stub server), P2 (env list)     |
| `package.json`                       | `@supabase/ssr` 0.12.7 and `@supabase/supabase-js` 2.118.0 (exact pins); the `test:e2e:auth` script                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | P1 (`test:e2e`)                     |
| `package-lock.json`                  | All 128 added lines (Supabase packages)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | none                                |
| `supabase/config.toml`               | All changes (`site_url`, redirect URLs, password length 8, local-only raised limits, confirmations on, two templates). **Local isolated test stack only**; not hosted settings                                                                                                                                                                                                                                                                                                                                                                                                              | none                                |
| `.env.example`                       | The "Client accounts" block                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | P1, P2                              |
| `CLAUDE.md`                          | The `src/app/account/` layout bullet; the `test:e2e:auth` command                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | P1                                  |
| `tests/unit/quote-route.test.ts`     | The two appended `describe` blocks: "with client accounts on" and "origin check"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | P2                                  |
| `tests/unit/studio-routes.test.ts`   | (untracked, P1) the `headers()` assertion replacing `toBeUndefined()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | P1                                  |
| `docs/studio-integration.md`         | (untracked) the "Client accounts (2026-10-30)" section                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | P1, P2                              |

The origin fix in `route.ts` (`sameOrigin`, which accepts the browser's Host
header when Next reports `127.0.0.1` as `localhost`) is a general facade bug
fix. It could go in the prerequisite commit if preferred.

## P1. Studio routing and recruitment (Claude, earlier session)

- **New:**
  - `src/lib/studio-routes.ts`, `vercel.json`
  - `src/app/(site)/clean-with-cosmos/`, `src/components/cleaners/ApplyAction.tsx` (later edited by P2's session)
  - `src/components/home/CleanTeaser.tsx`
  - `tests/e2e/studio-routes.spec.ts`, `tests/e2e/cleaners.mobile.spec.ts`, `tests/e2e/studio-stub.mjs` (later edited by P2's session)
  - `tests/unit/studio-routes.test.ts`
- **Modified:**
  - `next.config.ts` (`distDir`, `beforeFiles` rewrites)
  - `src/lib/site.ts` (footer, `cleaners`, `contactPage`, `servicesPage.termsHref`)
  - contact and services pages, `src/app/sitemap.ts`, `SiteNav.tsx` (`.sheet-more`)
  - `tests/e2e/links.spec.ts`
  - `.gitignore`, `.prettierignore`, `eslint.config.mjs`, `tsconfig.json` (`.next-test`)
  - `package.json` `test:e2e`, `playwright.config.ts` (stub webServer, `.next-test`)
  - README, CLAUDE.md (routing bullet), `.env.example` (`STUDIO_ORIGIN`)
  - `docs/studio-integration.md` (shared with P2)
- **Deletion:** `src/app/(site)/terms/page.tsx` (staged; see D).

## P2. Quote intake (other session / website Codex)

- **New:**
  - `src/lib/quote-attempt.ts`, `quote-date.ts`, `quote-draft.ts`, `quote-intake.ts`, `quote-request-guard.ts`
  - `src/lib/studio-intake.ts`, `studio-intake-contract.ts`
  - `src/components/quote/PreferredDate.tsx`, `QuoteFlow.module.css`
  - `tests/e2e/intake.quote.spec.ts`, `usability.quote.spec.ts`
  - `tests/unit/quote-usability.test.ts`, `studio-canonical.test.ts`, `studio-intake.test.ts`, `studio-intake-fixture.ts`
  - `docs/paired-adapter-verification.md`
- **Modified:**
  - Most of `QuoteFlow.tsx`, `src/app/api/quote/route.ts`, `src/app/quote/page.tsx`
  - `src/lib/quote.ts`, `quote-delivery.ts`
  - `tests/e2e/quote.spec.ts`, `tests/unit/fixtures.ts` (phone), `quote-delivery.test.ts`, the rest of `quote-route.test.ts`
  - `vitest.config.ts` (`server-only` alias)
  - `.env.example` (quote delivery section), the env list in `playwright.config.ts`
  - Parts of `docs/studio-integration.md`

## U. Unrelated presentation (Claude, earlier session)

- **New:**
  - `public/images/hero-office-day-{wide,tall}.jpg`
  - `src/components/home/ServicePicker.tsx`
  - `tests/e2e/scroll-progress.spec.ts`, `services.mobile.spec.ts`
- **Modified:**
  - `DayScroll.tsx`, `Hero.tsx`, `Evening.tsx`, `Services.tsx`, `ArtImage.tsx`
  - `LenisProvider.tsx`, `src/lib/scroll.ts`, `src/app/(site)/page.tsx`
  - `src/lib/metadata.ts` (OG alt), `public/og.jpg`
  - Hero, services-reel and recruitment styles in `globals.css`
  - `site.ts` (`home.hero`, `home.services`, `images`)
  - `tests/e2e/menu.mobile.spec.ts`
- **Deleted:** `public/images/hero-tall.jpg` (unstaged), plus the staged image deletions in D.

## D. The four pre-staged deletions

| Path                                                                    | Group | Needed by A?                                                                                                                                                                             |
| ----------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/images/hero-wide.jpg`, `home-day-tall.jpg`, `home-eve-tall.jpg` | U     | No. Nothing references them any more; cleanup only. (`hero-tall.jpg`'s deletion is unstaged, same group.)                                                                                |
| `src/app/(site)/terms/page.tsx`                                         | P1    | No for A. **Yes for P1:** `/terms` is Studio-owned and forwarded `beforeFiles`, so the site must not have its own page there. The P1 tests (`links.spec.ts`, sitemap) assume it is gone. |

## Overlaps: why A can't be split off on its own

- `QuoteFlow.tsx`, `api/quote/route.ts` and `quote/page.tsx`: every auth hunk
  sits inside or beside P2 code (`attemptRef`, `awaitingStudio`, `intakeMode`,
  the request guard) that `HEAD` doesn't have. An auth-only version of these
  files can't be built on `HEAD`.
- `quote-handoff.ts` imports P2's `quote-draft.ts`.
- `account.auth.spec.ts`'s quote-link test needs P1's rewrites and stub.
- `site.ts`, `SiteNav.tsx`, `globals.css`, `next.config.ts`,
  `playwright.config.ts`, `package.json`, `CLAUDE.md`, `.env.example` and
  `docs/studio-integration.md` mix A with P1/P2/U. They're separable by hunk,
  but the A hunks' context lines are P1/U code.

**So:** commit P1 + P2 (+ the terms deletion) first, as the reviewed
prerequisite. A then applies as a clean, independently valid second commit.
If P2 can't be committed separately in a buildable state, the fallback is one
narrowly scoped combined P2 + A commit for joint review. U can go before or
after, independently.

**Excluded from every commit:**

- `.env.local` (local keys)
- `.next/`, `.next-test/`, `test-results/`, `playwright-report/`, `build/`
- `tsconfig.json`'s generated `.next-test` type includes, if Codex prefers
  (Next rewrites that file on each build).

**Verified on the full combined tree** (2026-10-30):

- 165 unit tests
- 91 main browser tests
- 24 real local Supabase Auth browser tests (desktop and Pixel 7; 48 across two consecutive runs)
- lint, types and Prettier clean

## Customer-auth v2 contract: compatibility gaps (no adapter work started)

Contract: `wt-integration-implementation/docs/03-guides/customer-auth-v2.md`,
revision 2.1, commit `cc738d2`, branch `feat/customer-auth-foundation`.

**Already compatible:**

- `cosmos-client-auth` host-only HttpOnly Lax cookies, Secure on HTTPS.
- Server-only `AUTH_SUPABASE_*`.
- The `/account/*` routes and the `/account/confirm` token-hash `verifyOtp` callback with a 303 to a validated relative path.
- `signOut({scope: "local"})`, `getClaims` for UI only.
- The proxy never refreshes `/q` or `/pay`.
- No service-role key, and no `/api/customer` rewrite.

**Gaps for the website adapter, in rough order:**

1. **Intake v2:** a server-side adapter to `STUDIO_CUSTOMER_API_URL` + `/intake`:
   - `{version: 2, submission_id, answers}` with no identity field;
   - `Authorization: Bearer` with the session's access token (from `getSession` on the server, never forwarded browser headers), `X-Webhook-Secret` and `Idempotency-Key`.
   - Map 401/403 `email_unverified`/404/409/503.
2. **Fail closed:** in Studio mode, missing `AUTH_SUPABASE_*` or a missing session must refuse to send. Today `clientSession()` returning `off` lets `/api/quote` continue to the v1 test adapter. Accounts-off must never bypass authenticated intake.
3. **Attempts tied to an account:** retained attempts and the localStorage handoff aren't bound to an account today.
   - Bind them to the Auth user, e.g. store a hash of `sub`.
   - Never auto-submit another user's retained draft or attempt after an account switch, and never reuse a v1 UUID for v2.
   - Sign-out already clears the handoff; switching account without signing out must too.
4. **Account home adapter:** map `GET /account` (`linked`), `GET /requests` (cursor pagination) and `GET /requests/:id` onto `AccountOverview`:
   - Quotes to review: sent, not accepted, not superseded, not expired.
   - Upcoming: `scheduled_start_at` and `service_status`.
   - Payments: `payment_status` and the payment history.
   - `linked: false` should read as "no requests yet", not "not connected".
   - Never infer a booking from `quote_accepted`, and show `has_more` truncation honestly.
5. **Wrong-account wording:** Studio won't send `reason=wrong_account`; another owner's link reads as not found. The website's wrong-account screen stays as a generic switch-account action only, and the docs should say that.
6. **Email change:** secure email change (`updateUser({email})`, both addresses confirmed) has no UI or `email_change` callback branch yet. The callback currently allowlists only `email` and `recovery`.
7. **Passwords after recovery:**
   - With Secure password change on, an older session's `updateUser({password})` may need reauthentication; map that error.
   - Consider revoking other sessions after a recovery reset.
8. **Shared email templates:** the `{{ .RedirectTo }}&token_hash…` templates assume a `?next` query. They need branching, or an inventory of staff and cleaner email flows, before any hosted change.
9. **Paired tests** must use one isolated project for both apps' Auth and database. The current 24 website tests use website-local Auth only.

**Still open from `docs/client-accounts.md` (not solved by the contract):**

- Production rate-limit and forwarded-IP design (the test `VERCEL=1` proves nothing about it).
- Custom SMTP.
- Hosted Auth settings.
- Paired Preview and edge checks.
