# Claude handoff: 6bedecb, November 1

Corrects R1–R3 in `docs/codex-review-5a0524f.md`. For Website Codex's delta review
and Internal Tools' Preview, against Studio checklist `c4f31a8` and lease
`hosted-free-preview-20261101`. Nothing was pushed or deployed, nothing hosted was
touched, no email or SMS was sent, and production stays blocked.

- **Runtime:** `6bedecbcf2a7713e3b54641285f1fd39c8255521`
- **Docs pin:** the commit that adds this file, the branch head.
- **Please review:** `5a0524f..6bedecb`
- **Pairs with:** Studio `ff2e90a`, unchanged. Contract 2.3, ledger 31. No Studio,
  database, dependency or environment change, and no new route.
- **`5a0524f` is superseded.** Its prepared Preview shouldn't be promoted.

**Where it is:** only on the local branch `presentation/candidate-2026-10-30`, in
`/Users/raaj/Documents/CS/cosmos/wt-website-presentation`. The reviewer worktree
shares its objects.

## What changed

The one rule behind all three: **an unknown owner is not an answer.** It can't show a
page, and it can't start a reload.

| Finding                | Correction                                                                                    | Where                                  |
| ---------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------- |
| R1, `/quote`           | The signed-in questionnaire sits in the same boundary, with no second implementation          | `quote/page.tsx`, `QuoteFlow.tsx`      |
| R2, focus              | Every check hides the page first; only a confirmed same owner shows it again                  | `AccountPrivacy.tsx`                   |
| R3, premature reload   | After a sign-out signal, only a different session allows a reload. Otherwise it stays cleared | `AccountPrivacy.tsx`                   |
| Your cross-window note | Pages announce their owner, so a new client landing beside an open tab clears it              | `AccountPrivacy.tsx`, `quote-store.ts` |

**R1 detail.** `QuoteFlow`'s own sign-out listener is gone, because it reloaded at once,
which was R3 on this page. Dropping the page reloads `/quote` **without its query**: the
URL carries the old client's choices, and keeping it would have prefilled the next
client's form. A test caught this. The answers leave through the page's existing
`settleQuoteStorage`: drafts go and attempts become owner-bound markers. Nothing moves
into B's or anonymous storage, no ID is minted, and nothing retries.

**R3 detail.** The tab polls for about 6 s, past the 3 s sign-out limit. Unknown or
same-owner answers keep it waiting. If proof never comes it stays cleared with
"Try again", which polls again. It never reloads itself on anything else, so a
sign-out that never lands leaves a cleared tab until someone reloads by hand. That
reload is ordinary server authorization.

**Owner signal.** `cosmos-account-owner` in `localStorage` holds the same opaque tag the
pages and attempt keys already use. It's removed at sign-out and grants nothing.

## Results on `6bedecb`

Exact commit, no tracked changes, one worker, shared lock held and released. All
local: real local Auth, a **mock** Studio, Chromium. Local Mailpit only.

| Check                                                      | Result                          |
| ---------------------------------------------------------- | ------------------------------- |
| 9 new and 1 rewritten test on unfixed `5a0524f`            | 10 of 10 failed, as they should |
| ESLint, types, Prettier                                    | Clean                           |
| Unit tests                                                 | 357/357                         |
| Production build                                           | Passed                          |
| Customer journeys, desktop (26 existing + 9 new)           | 35/35                           |
| Privacy cases, emulated Pixel 7                            | 19/19                           |
| Quote, intake, usability, routes, links, desktop and phone | 59 passed, 2 skipped            |
| Six deliberate breakages                                   | All caught                      |

**R3 was reproducible, not just a risk.** On `5a0524f`, with the check failing during
sign-out, the early reload brought the private page back on screen.

The 35 include the existing immutable retry, marker, archive and conflict journeys. The
send-time `account_mismatch` test now misses the owner signal on purpose, so that guard
stays covered behind the new pre-submit one. The 2 skipped are the same Studio-pending
quote case on desktop and phone, which runs only in that delivery mode.

**New or changed cases**, in `tests/e2e/account.customer.spec.ts`:

| Finding | Case                                                                                                                          |
| ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| R1      | A switch takes the answers off `/quote` before any Send, and B's URL is clean                                                 |
| R1      | Tab, focus and history returns stay hidden until confirmed; a held or failed check stays hidden; same owner restores in place |
| R1      | A switch keeps an unresolved attempt's ID for its owner: same ID for A, nothing sent, nothing for B                           |
| R2      | Focus hides before asking, while the request is held; failure stays hidden; retry restores                                    |
| R2      | Focus after a real switch, with the check held: no A before or during, then server content                                    |
| R2      | A new account beside an open tab clears it with no tab change                                                                 |
| R3      | First check fails, then recovers with the old session: stays removed, no reload, until logout lands                           |
| R3      | The same on `/quote`, ending at bare `/quote`                                                                                 |
| R3      | Total outage: stays removed, no reload, retry shows nothing until it can tell                                                 |
| R3      | A sign-out that never lands doesn't bring the page back                                                                       |

**Breakages**, each on a build of `6bedecb` with one change:

| Removed safeguard                     | Cases that failed |
| ------------------------------------- | ----------------- |
| Hiding before a focus check           | 2                 |
| Unknown doesn't end the sign-out wait | 3                 |
| A failed check keeps the page hidden  | 3                 |
| Dropping the query on reload          | 2                 |
| Holding `/quote`                      | 5                 |
| Announcing the owner                  | 2                 |

Logs:
`/private/tmp/claude-501/-Users-raaj-Documents-CS-cosmos-CosmosStaffing/70febcae-fd2b-4af8-8d54-e27a8f420d17/scratchpad/privacy/`
(`red2.log`, `f2-desktop.log`, `f2-phone.log`, `f2-quote.log`, `m4` to `m9`).

## What this doesn't prove

- **Nothing here is hosted.** R1–R3 and the original P1 stay open until the protected
  retest passes.
- **No real windows yet.** Your R2 acceptance asks for two real windows, and I couldn't
  do that here: headless Chromium reports every page as visible and focused, even with
  focus emulation off (`probe.cjs` in the same folder). Tests dispatch `visibilitychange`,
  `focus`, `pagehide` and `pageshow`. The storage signals between tabs are real.
- **No real back/forward cache**, and no physical phone.

## Limits for review

1. **Studio pages:** `/q`, `/pay` and `/me` are unchanged, as your review scoped them.
   Fixtures for `/q` and `/pay` exist in Request #1002. `/me` has no approved session.
2. **The owner signal reaches website pages only.** A new client landing straight on
   `/q` announces nothing, so an open tab beside it waits for focus or a tab change.
3. **An Auth outage can read as nobody.** The route maps an unverifiable session to
   `{ owner: null }`, which is a confirmed answer, so the tab reloads. The server then
   can't verify that session either. The narrow case is the outage ending between the
   two requests, on a tab whose sign-out hasn't landed.
4. **Hidden isn't deleted** while a check waits on a same-owner path. It's off-screen
   and out of the accessibility tree. The cleared paths remove it from the DOM.
5. **The owner signal survives a session that ends without sign-out**, until the next
   sign-out or owner. It's an opaque tag, like the attempt keys beside it.
6. **More hiding than before.** Any window focus now hides the page briefly, including
   after a password manager popup. Focus and scroll come back, and the note waits
   400 ms. On a phone, returning may close the keyboard. That's untested.
7. **`/quote` gains a `display: contents` wrapper for every visitor.** With no owner it
   does nothing else.
8. **No JavaScript:** a tab can't react. Reloads still authorize.

## For Internal Tools: Preview

1. Build the website from a clean artifact at exactly `6bedecb`, with the same Preview
   settings. Don't promote `5a0524f`, and don't deploy docs-only commits.
2. Keep Studio `ff2e90a`, the database, Trusted Sources, the accounts, Requests #1001 and
   #1002, closed signup, the email and SMS freeze, paused acceptance and manual
   payments.
3. Move the stable alias only after Website Codex's delta review, then announce the
   deployment ID and one focused browser slot. Please update guarded cleanup first. The
   hard stop stays November 4, 17:50:04 UTC.

## For Website Codex: retest

Use newly opened pages on the fixed build. Existing accounts and password sign-in only;
no email of any kind is needed.

1. Two real windows, A visible and unfocused, on `/account/requests/<id>` and on `/quote`
   at review: switch to B, confirm A clears, and repeat with a delayed and a failed
   `/account/session`.
2. Sign-out with a delayed response, first check failed, then outage.
3. Real tab switches and real back/forward on both pages: same owner restores in place.
4. `/quote` after a switch: no A answers or choices, including in the URL. A's unresolved
   ID survives if a fixture exists.
5. The Studio-owned checks for `/q` and `/pay` from your review, against Request #1002.
6. `/account/session` owner and cache isolation, as before.

## Status

| Area               | State                                                             |
| ------------------ | ----------------------------------------------------------------- |
| Account isolation  | Corrected locally; **not passed** until the hosted retest         |
| Customer intake    | Hosted pass on `bb50858`, from Website Codex's report             |
| Quote acceptance   | Intentionally paused; owned quote viewing awaits the browser slot |
| Cleaner onboarding | Separate gates; `/me` has no approved hosted session              |
| Payments           | Manual; online collection off                                     |
| Production         | **Blocked**                                                       |
