# Claude handoff: 5a0524f, November 1

**Superseded by `docs/claude-handoff-6bedecb.md`.** Website Codex's review found R1–R3 in `5a0524f`, so its Preview shouldn't be promoted.

Fixes the P1 in `docs/codex-hosted-privacy-bb50858.md`. For Website Codex's review
and Internal Tools' replacement Preview, against Studio checklist `bfa873e` and lease
`hosted-free-preview-20261101`. Nothing was pushed or deployed, nothing hosted was
touched, no email was sent, and production stays blocked.

- **Runtime:** `5a0524f440f9a59485d8c6e048ee00c86abfb6f7`
- **Docs pin:** the commit that adds this file, the branch head.
- **Please review:** `bb50858..5a0524f`
- **Pairs with:** Studio `ff2e90a`, unchanged. Contract 2.3, ledger 31. No Studio,
  database, dependency or environment change.

**Where it is:** only on the local branch `presentation/candidate-2026-10-30`, in
`/Users/raaj/Documents/CS/cosmos/wt-website-presentation`. The reviewer worktree
shares its objects and can read it.

## The fix

The fault was a document that outlived its session, so the fix is in the browser.
Server authorization, private caching and ownership are unchanged.

- **`src/components/account/AccountPrivacy.tsx`** holds a signed-in client's page
  inside the account shell's card. The header and footer aren't private and stay.
- **`src/app/account/session/route.ts`** is a new `GET /account/session` on this
  website, not the Studio. It returns only `{ owner }`: the `ownerTag` the account
  pages already carry, or null. It uses the existing `clientSession()`, so there's
  no second authentication path, and it's `private, no-store`.
- The shell keys the boundary by owner, so a new owner never inherits its state.

| Event                                  | What happens                                                            |
| -------------------------------------- | ----------------------------------------------------------------------- |
| Sign-out signal from another tab       | Page removed from the DOM at once, then reload when sign-out has landed |
| Tab hidden, or page stored for history | Page hidden synchronously                                               |
| Tab returns, or page restored          | Stays hidden until the owner is confirmed                               |
| Same owner                             | Shown in place: no reload, scroll and focus kept                        |
| Different owner, or nobody             | Page removed, then reload, so the server decides                        |
| Check can't finish                     | Stays hidden, with "Try again"                                          |
| Window regains focus, never hidden     | Background check; page stays up unless the owner changed                |

**Why the signal waits.** `forgetOnSignOut` signals on submit, while the cookies are
still valid, so an immediate reload could show the same client again. The tab polls
the owner for up to about 4 s, past the 3 s sign-out limit, then reloads either way.

**Drafts and attempts.** `quote-store.ts`, `QuoteFlow`, `QuoteStorageSweep` and the
sign-out signal aren't changed. The boundary only reads that signal.

## Results on `5a0524f`

These ran on the exact commit with no tracked changes, except where noted. One
worker, the shared lock held for build and browser runs, and released. All local:
real local Auth, a **mock** Studio, Chromium.

| Check                                            | Result                        |
| ------------------------------------------------ | ----------------------------- |
| Reproduction on the unfixed runtime              | 3 of 3 failed, as they should |
| ESLint, types, Prettier (`src`, `tests`)         | Clean                         |
| Unit tests (352 + 5 new)                         | 357/357                       |
| Production build; `/account/session` is dynamic  | Passed                        |
| Customer journeys, desktop (18 existing + 8 new) | 26/26                         |
| The 8 new cases, emulated Pixel 7                | 8/8                           |
| Studio routes and links, desktop                 | 9/9                           |
| `npm audit --omit=dev`                           | 0                             |
| Three deliberate breakages (see below)           | All caught                    |

The reproduction failed on A's details remaining on screen, not on setup. That build
was `187cadd` plus the copy strings and tests only.

The 18 existing journeys are the evidence that drafts, attempts, markers and
sign-out behave as before. New cases, in `tests/e2e/account.customer.spec.ts`:

1. A's detail page clears at sign-out elsewhere, stays gone after B signs in, and B's
   direct request stays opaque.
2. The signal hides the page before sign-out has finished.
3. A tab returning after a switch with no signal never shows A.
4. Focus catches a switch on a tab that never left the screen.
5. A page restored from history checks first.
6. Back and forward after signing out show nothing private.
7. The same client keeps the page and focus with no reload, and can still navigate.
8. A check that can't finish keeps the page hidden until one does.

**Breakages.** Removing the wait failed case 2. Trusting a different owner failed
cases 3, 4 and 5. Showing the page when the check failed failed case 8. These ran
just before a final change that moved the status note onto `document.body`, because
the card was placing it off-centre. That change touched nothing else, and the
breakages weren't repeated. Everything in the table above ran after it.

Logs:
`/private/tmp/claude-501/-Users-raaj-Documents-CS-cosmos-CosmosStaffing/70febcae-fd2b-4af8-8d54-e27a8f420d17/scratchpad/privacy/`
(`red.log`, `final-desktop.log`, `final-phone.log`, `final-routes.log`, `m1` to `m3`).

## What this doesn't prove

- **Nothing here is hosted.** The P1 stays open until the protected retest passes.
- **Tab and history events were simulated.** Tests dispatched `visibilitychange`,
  `pagehide` and `pageshow`. Case 1's storage signal was real, between two tabs. Real
  Chrome tab switches and real back/forward cache need the hosted retest.
- **No physical phone.** The phone profile is emulation.

## Limits for review

Website Codex should rule on whether any of these block release.

1. **Studio pages aren't covered:** `/q`, `/pay` and `/me` are rendered by the Studio
   and forwarded, so this shell never wraps them. An open quote or payment tab may
   retain its content in the same way. It's untested, since no owned quote fixture
   exists. A fix there would be Studio-owned.
2. **`/quote` on a switch with no sign-out:** it still has its own listener, so
   sign-out clears it. A confirmation link for another account, with no sign-out,
   leaves the answers on screen until Send, where the owner check stops it. The
   existing test covers that stop. The boundary could cover this later; the report
   asked to keep draft behaviour as it is.
3. **Hidden isn't deleted:** on the hide paths the page stays in the DOM while
   `visibility: hidden`, and on the signal path Next's page data stays in memory,
   until the reload. It's off-screen and out of the accessibility tree.
4. **Two windows side by side:** a switch with no sign-out is caught when this
   window regains focus, not before.
5. **No JavaScript:** a tab can't react. Reloads still authorize.

Each return to a tab costs one small website request. It makes no Studio call and
sends no email. Returning shows a blank card briefly; the note appears only after
400 ms.

## For Internal Tools: replacement Preview

1. Build the website from a clean artifact at exactly `5a0524f`. Keep the current
   Preview settings; nothing new is needed. Don't deploy docs-only commits.
2. Keep Studio `ff2e90a`, the database, the Trusted Sources rule and the send freeze.
   Signup stays closed. The stable alias should move to the new deployment, so the
   Studio's public origin and customers' host-only cookies stay valid. Please record
   the deployment ID and update guarded cleanup before changing it.
3. Reopen one focused browser slot for Website Codex. The hard stop stays
   November 4, 17:50:04 UTC.

## For Website Codex: retest

Use fresh tabs: a tab opened on `bb50858` doesn't have the fix. Use existing confirmed
accounts and password sign-in, with Raj's current credential for A. No recovery,
signup or other email is needed.

1. A detail open → sign out in another tab → B signs in → return to the first tab.
2. Sign-out alone.
3. Real browser back and forward, including restoring a page after sign-out.
4. A real tab switch with the same owner: the page returns in place.
5. B's direct request for A's URL stays opaque.
6. Drafts and unresolved attempts behave as before.
7. `/account/session` for each state: only `{ owner }`, `private, no-store`, edge
   MISS, nothing shared between A, B and signed out.

## Status

| Area               | State                                                           |
| ------------------ | --------------------------------------------------------------- |
| Account isolation  | Fixed locally; **not passed** until the hosted retest           |
| Customer intake    | Hosted pass on `bb50858`, from Website Codex's report           |
| Quote acceptance   | Intentionally paused; owned quote viewing still needs a fixture |
| Cleaner onboarding | Separate gates: agreement, hosted SMS, staff and cleaner checks |
| Payments           | Manual; online collection off                                   |
| Production         | **Blocked**                                                     |
