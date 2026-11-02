# Claude handoff: 5c44889, November 1

Closes the remaining R3 finding in `docs/codex-review-6bedecb.md`. For Website Codex's
delta review and Internal Tools' Preview, read alongside
`docs/claude-handoff-6bedecb.md`, which still holds the full design. Nothing was pushed
or deployed, nothing hosted was touched, no email or SMS was sent, and production stays
blocked.

- **Runtime:** `5c448893cf229a29dda2113e4de2caf8d7e3ec6a`
- **Docs pin:** the commit that adds this file, the branch head.
- **Please review:** `6bedecb..5c44889`
- **Pairs with:** hosted Studio `ff2e90a`, ledger 31, contract 2.3. No Studio, database,
  dependency or environment change, and no new route.
- **`6bedecb` is superseded.** Its prepared artifact shouldn't be deployed.

**Where it is:** only on the local branch `presentation/candidate-2026-10-30`, in
`/Users/raaj/Documents/CS/cosmos/wt-website-presentation`. The reviewer worktree shares
its objects.

## What changed

Two application files, 18 lines added and 7 removed.

- **`src/app/account/session/route.ts`:** `{ owner: null }` now means proven nobody, and
  only `signed_out` returns it. `expired` and `off` prove nothing, so they answer 503
  with no body, `private, no-store`. The boundary already treats any non-2xx as unknown.
- **`src/components/account/AccountPrivacy.tsx`:** one addition you didn't ask for. A
  session that has really ended reads as `expired` once, as the proxy clears its cookie,
  and as `signed_out` after that. With the route change alone, that client would be left
  on "Check your connection". So a check that gets an unknown answer asks once more
  before showing that note. An outage is unknown both times and stays hidden. The
  sign-out wait is unchanged, since it already polls.

Server data access, `clientSession()` and the proxy aren't changed.

## Your acceptance

| #   | Requirement                                                                                             | Evidence                                                                   |
| --- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | Cookie present, Auth outage: no claim of absence; stays cleared, no reload; recovery as A keeps waiting | Adapted harness and "a session that can't be verified…", desktop and phone |
| 2   | Real cookie removal may navigate; a different owner may navigate                                        | Both of those, plus the existing switch cases                              |
| 3   | Same-owner return restores; a continuing outage offers retry; private and opaque                        | Same test, unit cases, harness                                             |
| 4   | Update the `expired -> null` unit case; add the uncertainty regression                                  | `account-session.test.ts`; two new browser cases                           |

## Results on `5c44889`

No code changes in the tree, one worker, shared lock held and released. All local: real
local Auth, a **mock** Studio, Chromium. Local Mailpit only.

| Check                                                | Result             |
| ---------------------------------------------------- | ------------------ |
| Unit tests                                           | 357/357            |
| ESLint, types, Prettier                              | Clean              |
| Production build                                     | Passed             |
| Affected privacy cases, desktop                      | 22/22              |
| The same cases, emulated Pixel 7                     | 22/22              |
| Your `outage.cjs`, adapted to the required behaviour | Passed, every step |
| Fix reverted in the route                            | Caught             |
| Second ask removed                                   | Caught             |

**Harness.** `outage-fixed.cjs` is your harness with its assertions turned around, on the
same real SDK path with a mocked 503, and real server, route and boundary code. It records:
endpoint 503 with no body, zero cookie writes, cleared with 0 reloads during the outage,
still 0 after recovering as A, 1 reload once the cookie goes, same-owner focus restored,
and an outage through the whole wait ending cleared and unconfirmed with 0 reloads. The
transport, cookies and browser hooks are mocked.

**Reverted safeguards.** With the fix reverted, the ended-session test failed waiting for
the 503. With the second ask removed, it failed at the sign-in heading, stuck on the note.

**On unfixed `6bedecb`:** the two `expired` and `off` unit cases failed, and your harness
already recorded the failure there.

**Reused, not rerun, as you directed:** the other 15 desktop customer journeys and the
59 quote, route and link checks from `6bedecb`. The route changed only for `expired` and
`off`, and the second ask only runs after an unknown answer.

**A correction to my own test.** My first version simulated an outage with a malformed
cookie. That failed on the fixed code, because the server really does clear such a cookie.
So that's a dead session, not an outage, and it's what exposed the need for the second
ask. It's now two cases: the outage holds a 503 at the browser with the good cookie in
place, and the dead session uses the real server.

Logs:
`/private/tmp/claude-501/-Users-raaj-Documents-CS-cosmos-CosmosStaffing/70febcae-fd2b-4af8-8d54-e27a8f420d17/scratchpad/privacy/`
(`f3-desktop.log`, `f3-phone.log`, `m10-fix-reverted.log`, `m11-one-ask.log`,
`outage-fixed.cjs`, `outage-fixed.json`).

## What this doesn't prove

- **Nothing here is hosted.** R1–R3 and the original P1 stay open until the retest passes.
- **No real Auth outage ran.** In the browser test the 503 is held at the page, and the
  server's half is covered by the unit cases and the harness. A real hosted outage isn't
  planned, since it would mean changing a provider setting.
- **No real windows, back/forward cache or physical phone**, as in the `6bedecb` handoff.

## Limits for review

The limits in `claude-handoff-6bedecb.md` still apply, except limit 3, which is closed.
One addition, and one to weigh:

1. **A dead session costs one extra request** on return to the tab. An outage costs two
   failed requests per check.
2. **An expired cookie that the server never clears** would stay `expired` and leave an
   open tab hidden with "Try again". Reloading the tab goes through the existing sign-in
   redirect. I found no such case: the malformed cookie was cleared.

## For Internal Tools: Preview

1. Build the website from a clean artifact at exactly `5c44889`, with the same Preview
   settings. Don't deploy `5a0524f` or `6bedecb`, or a docs-only commit.
2. Keep hosted Studio `ff2e90a`, ledger 31, the database, Trusted Sources, the accounts,
   Requests #1001 and #1002, closed signup, the email and SMS freeze, paused acceptance
   and manual payments. The checkout candidate stays out of this slot.
3. After Website Codex approves the delta, follow the lease's steps: register the
   deployment with guarded cleanup, verify protection and runtime, move only the owned
   Preview alias, and announce the deployment and slot. The hard stop stays November 4,
   17:50:04 UTC.

## For Website Codex

Delta review first, then the retest list in `claude-handoff-6bedecb.md` against
`5c44889`, on newly opened pages. One addition for that slot: `/account/session` should
give 200 with an owner signed in, 200 with `null` signed out, and never 200 with `null`
for a cookie it can't verify.
