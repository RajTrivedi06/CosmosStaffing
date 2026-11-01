# Claude handoff: bb50858, November 1

**Superseded by `docs/claude-handoff-5a0524f.md`** for the current candidate.

For Website Codex and Internal Tools, against the release checklist at Studio
`0f32118`. Nothing was pushed or deployed, nothing hosted was configured, and
production stays blocked.

- **Runtime:** `bb5085806dd39654ed8f73f91d0e0d9d03e06757`
- **Docs pin:** the commit that adds this file, the branch head.
- **Please review:** `736faab..bb50858`
- **Paired with:** Studio `7591252`. It keeps contract 2.3 and checkout off, so the
  website needs no change for it.

**Where it is:** only on the local branch `presentation/candidate-2026-10-30`, in
`/Users/raaj/Documents/CS/cosmos/wt-website-presentation`. It isn't on GitHub, or in
the main checkout at `1773aad`. A Preview needs a push or a direct deploy, which
isn't authorized yet.

| Commit    | Change                                                                |
| --------- | --------------------------------------------------------------------- |
| `b7f638e` | Replaces the bypass with Trusted Sources; adopts redirect contract R2 |
| `42a7f62` | Paired tests: paused acceptance, real Studio redirects (test only)    |
| `bb50858` | Pins the OIDC helper to 3.5.0                                         |

## What changed

- **Access:** `STUDIO_PROTECTION_BYPASS` is gone. Each request gets a fresh token from
  `getVercelOidcToken()`, after the exact origin check, in both `src/proxy.ts` and
  `customer-api.ts`. Vercel Production never asks for one.
- **No token:** nothing is sent. Forwarded paths return 503, and the customer API
  reads as unavailable, so sessions and quote attempts are kept. There's no fallback.
- **Redirects:** website acknowledgement of R2. Rewrites stay, nothing filters
  `Location`, and the synthetic off-site test is now labeled a leak test.
- **Paired tests:** they still expected online acceptance, which contract 2.3 pauses.
  They now expect the paused state and `terms_unavailable`, and a new case follows the
  Studio's real sign-in redirects and proves they stay on the website.

**Dependency review:** `@vercel/oidc` 3.5.0, exact, with no dependencies. It adds
one package and changes no others, and `npm audit --omit=dev` finds nothing. I
tried 4.0.1 first and dropped it: 3.6 and later add 17 packages through Vercel's CLI
config, which carries a high-severity zod advisory (GHSA-mrhx-c7xc-m3w5). 3.5.0 reads
the same request context and environment token. It lacks only the token file option,
which this design doesn't use.

## Results on `bb50858`

| Check                                         | Result                   |
| --------------------------------------------- | ------------------------ |
| ESLint, types, format                         | Clean                    |
| Unit                                          | 352 of 352               |
| Build scan with a planted build-time token    | 0 of 550 files, 147 maps |
| Token code in client bundles                  | 0 files                  |
| Gateway, routes, links (desktop)              | 19 of 19, one worker     |
| Service reel, including pinch (phone)         | 14 of 14, one worker     |
| Customer journeys, real Auth with mock Studio | 18 of 18, desktop only   |

All of it ran on `next start` with a stand-in Studio. The real helper ran with a
synthetic token from the environment, so this doesn't show what Vercel's request
context does.

Six protections were removed in turn and tests failed each time: the origin check
before the token, sending without a token, asking outside a Preview, and three
ways of ignoring a refused admission. That ran on `42a7f62`, whose source matches
`bb50858` apart from the helper version, which those tests mock.

## Still pending

Nothing below has been run on `bb50858`.

1. **Website Codex review** of `736faab..bb50858`.
2. **Whether the helper finds a token inside `proxy.ts` on Vercel.** This is the
   first hosted check. Vercel documents it for Functions, and an
   [open report](https://github.com/vercel/vercel/issues/13885) says it was missing
   in Next.js middleware. If it's missing, forwarded paths return 503 and the customer
   API still works. The checklist says to stop and report that.
3. **Paired run** with Studio `7591252`. The updated paired spec has never run, so the
   paused-acceptance and real-redirect cases are unproven.
4. **Full suites.** 122 main browser and 78 real Auth last ran on `736faab`, and the
   five-page visual check too. This delta doesn't touch those pages or sign-in.
   `customer-mobile` wasn't run.
5. **Everything hosted:** the numbered checks in
   `docs/protected-preview-access.md`, the full customer journey, and password
   recovery.
6. **A physical phone.** All phone results are emulated.

## For Internal Tools

1. Replace `736faab` / `0e7a364` in the checklist with these pins once reviewed.
2. **Open: missing public origin.** Website Codex's condition 2 asks that a missing
   `NEXT_PUBLIC_PUBLIC_BASE_URL` fail unavailable instead of falling back to the Studio
   host. R2 at `0f32118` only says to set it. The fallbacks are
   `apps/operations-studio/src/proxy.ts:136` and `:150`, and `publicReturnOrigin()`.
   Please accept that as a Studio guard or record why not. A signed-out customer would
   otherwise land on the protected Studio host.
3. **Build order.** Each project is built with the other's address, so two
   per-deployment URLs can't work. Use the website's stable branch URL. Steps are in
   `docs/protected-preview-access.md`.
4. **Failed admission:** Vercel's own login redirect can't be covered by Studio code.
   The hosted run must treat it as a failure.
5. Every website Preview build needs `STUDIO_APPROVED_ORIGIN` and an equal
   `STUDIO_ORIGIN`, or it fails.

## Readiness

| Area               | Local                                                       | Ready for launch?                                      |
| ------------------ | ----------------------------------------------------------- | ------------------------------------------------------ |
| Customer intake    | Website checks pass; last paired on `4d59821`               | No: needs the paired run and hosted checks             |
| Quote acceptance   | Viewing works; online acceptance paused                     | No: unavailable until terms are approved               |
| Cleaner onboarding | Studio flow verified locally                                | No: draft agreement can be signed; hosted SMS unproven |
| Payments           | Manual follow-up only; Stripe code integrated, checkout off | Card payments no; manual arrangement is the plan       |
