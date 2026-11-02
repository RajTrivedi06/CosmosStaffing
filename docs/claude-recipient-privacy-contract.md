# Website contract for the Studio's `/q` and `/pay` privacy fix

For the Studio owner fixing `docs/codex-hosted-recipient-ff2e90a.md`. Website Claude owns
this contract. The Studio fix stays Studio-owned, and nothing here changes website code.

**The fix needs no new endpoint and no website change.** Forwarded pages load from the
website's origin, so they already share its `/account/session` route and its
`localStorage`. Studio's `connect-src 'self'` allows the request. I checked this by
reading website `5c44889` and Studio `ff2e90a`. It hasn't been run from a Studio page.

## What the website provides, stable as of `5c44889`

**`GET /account/session`**, same origin, `private, no-store`, session cookie sent:

| Answer                      | Meaning                                                     |
| --------------------------- | ----------------------------------------------------------- |
| `200 { "owner": "<tag>" }`  | Verified customer                                           |
| `200 { "owner": null }`     | Proven nobody signed in                                     |
| `503`, empty body           | Unknown: the session can't be verified, or accounts are off |
| Anything else, or a failure | Unknown                                                     |

**Owner tag:** the first 32 hex characters of
`sha256("cosmos-quote-owner:" + authUserId)`, from `src/lib/account/owner.ts`. The Studio
can compute it on the server from the verified customer and pass it to the page. It's
opaque and grants nothing. Don't derive it in the browser.

**`localStorage` signals**, heard through the `storage` event:

| Key                       | Written                                    | Meaning                                          |
| ------------------------- | ------------------------------------------ | ------------------------------------------------ |
| `cosmos-quote-signed-out` | When sign-out **starts**                   | Clear now; cookies may still be valid            |
| `cosmos-account-owner`    | When a website account or quote page opens | Another owner's page opened; removed at sign-out |

Sign-out only happens on website pages today. Studio pages don't write these keys, and
don't need to for this fix.

## What each review round caught

`src/components/account/AccountPrivacy.tsx` at `5c44889` is the reviewed reference, and
`tests/e2e/account.customer.spec.ts` has a case for each rule. Every one of these was a
real defect or a test failure on the way here.

1. **Hide before every check,** including plain window focus, or the page stays up while
   the check runs and for good if it fails.
2. **An unknown answer is not an answer.** It can't show the page and it can't start a
   reload. Only the same owner shows it, and only a different owner or proven nobody leaves.
3. **The sign-out signal comes early.** Remove the content at once, then poll. Reloading
   before a different answer arrives can bring the old page back on the old cookies. If
   proof never comes, stay cleared with a retry.
4. **Ask twice before saying you can't confirm.** A dead session answers 503 once as its
   cookie clears, then `null`. An outage fails both times.
5. **Listen to all of these:** `visibilitychange` both ways, `pagehide`, `pageshow` with
   `persisted`, window `focus`, and both storage keys. Hide with `flushSync`, because the
   browser may freeze the page next.
6. **Reload to `location.pathname`,** so no query comes along. On `/q` and `/pay` the
   token is in the path, so this reloads the same document, and the server then denies it.
7. **Hide with `visibility: hidden`,** not `display: none`, so scroll position survives.
   Restore focus afterwards.
8. **Put the status note on `document.body`** if a card creates a containing block, or
   `position: fixed` lands off-screen on long pages.

## Studio-specific points

- **Direct Studio origins:** `/account/session` exists only on the website, so the check
  would answer 404 on a direct Studio host, and rule 2 would hide the page for good.
  Enable the boundary only when the page is on the configured public origin.
- **Only `/q` and `/pay`.** `/me` uses the separate cleaner phone session, and customer
  sign-out must not touch it. Leave `/join` and `/o` alone.
- **Don't tie this to the server's outage handling.** `requireCustomerPageSession` shows
  not-found for a provider failure. That's a fresh request, and this is about a page
  already open.

## Limits

- Tests in headless Chromium dispatch the tab and history events, because it reports
  every page as visible and focused. Real behaviour needs Website Codex's hosted run.
- If the Studio pins a different website commit, this contract holds only if
  `/account/session` and these keys are unchanged there.

If the Studio needs something this doesn't cover, say so in the shared handoff and I'll
make the website side of it.
