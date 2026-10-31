# Morning handoff, October 31

**Recommendation: not ready for production.** The website candidate is ready for
review. What's left is Studio work, hosted setup and your decisions. Nothing was
pushed, deployed or enabled, and no hosted setting or DNS record changed.

## The candidate

- **Current candidate: `736faab6ee70842412a4b080ad91ce970e90154f`**, on branch
  `presentation/candidate-2026-10-30`, in
  `/Users/raaj/Documents/CS/cosmos/wt-website-presentation`. It's `eeff78c` plus pinch
  zoom (`89d1c43`), the copy decided on October 31 (`68fccca`, `91e5c85`), and
  server-side access to a protected Studio Preview, bound to one approved origin
  (`d05541c`, `616a066`, `736faab`; see `docs/protected-preview-access.md`). On
  `736faab`: lint, types and format clean, 349 unit, 122 main browser with 3
  intentionally skipped, 78 real Auth. The test table below describes `54dd966`. The
  44 paired tests last ran on `4d59821`, and they don't cover the new proxy and
  customer API path or Studio's later changes, so the protected Preview must.
- It's the launch commits plus the hero, services reel and image work.
- **Your original work is safe.** It's preserved at
  `presentation/original-2026-10-30`. The main checkout is still on
  `feat/cosmos-staffing-site` at `1773aad`, with the presentation work uncommitted
  and three image deletions staged, as they were. Don't commit those deletions
  alone. Nothing has been merged into that branch.

## What changed overnight

| Commit    | Change                                                                |
| --------- | --------------------------------------------------------------------- |
| `fb6d083` | Placeholders, unsupported promises and Terms links removed            |
| `ddc3f80` | Email only: both phone numbers removed, no hours                      |
| `7047b2f` | Glass backing behind the wordmark when the full bar is over photos    |
| `68a0777` | Remaining absolute promises replaced with the quote and coordination  |
| `771993e` | Scrolling down leaves only the button, which keeps its place and size |
| `54dd966` | Phones can swipe service cards sideways in normal motion (Codex P2)   |

The overlap you reported and Codex's navbar finding are both fixed by `771993e`.

## Test results

| Check                                  | Result on `54dd966`                                                         |
| -------------------------------------- | --------------------------------------------------------------------------- |
| ESLint, TypeScript, Prettier           | Clean                                                                       |
| Unit tests                             | 290 passed                                                                  |
| Main browser suite                     | 106 passed, 2 intentionally skipped                                         |
| Real Auth with mock Studio             | 78 passed                                                                   |
| Five pages, desktop and emulated phone | No overflow, broken images, failed requests, console errors or placeholders |

**Paired evidence is reused, not new.** All 44 paired tests passed on `4d59821`, on
a production build, with Studio `961d519`: 22 desktop and 22 emulated phone. That
covers signup, sending, history, ownership, conflicts, revoked sessions, a wrong
server credential through the website, and two-session recovery. The changes since
touch only public pages, the header and the service reel, and the account copy is
byte-identical, so I didn't rerun it. That lease is closed, and Codex advised
against rerunning it for copy.

Undoing the swipe and navbar fixes on purpose turned their tests red, so those
tests do catch the bugs.

## What I need from you

Updated October 31. Contact is decided: email only, with no phone numbers or hours.

1. **Terms of Service: this blocks quote acceptance.** Customers must tick "agree
   to the Terms of Service" to accept a quote, and that page says "final text
   coming soon". You'd need to supply terms, or approve a different step.
2. **The two remaining claims to confirm** are in `docs/launch-cutover.md`: service
   scope, and the cleaner-page statements.
3. **Policies, if you want them on the site.** Each is off the site until
   confirmed: insurance, re-cleans, cancellation, assigned cleaners, supplies,
   cleaner pay and payout, and notes after visits.
4. **Hosted decisions:** Vercel access, an isolated Preview and its cost, the SMTP
   sender and test recipients, the rate-limit budget, a maintenance window, a DNS
   operator, and who handles support verification and lookups.

## Owned by others

- **Internal Tools:** the Terms page or a replacement step, its Production guard
  change, the migration rehearsal, backup, hosted Auth and templates, and the
  support lookup.
- **Website Codex:** delta review of `d05541c..736faab`; see
  `docs/claude-handoff-736faab.md`. Its reviews are in `docs/`, and its hosted
  checklist is `hosted-preview-acceptance.md`.

## Known limits

- The two phones in testing are emulated. No physical device has been tested.
- Nothing here proves hosted behaviour: HTTPS cookies, the real edge, WAF, SMTP,
  or the staff and cleaner journeys.
- A native form's 429 shows whatever the edge sends, so the WAF rule needs a usable
  response.
- Online payment and self-service email change are off by decision.
- Service buttons read "Get a workplaces quote", which is slightly awkward. I left
  it as outside this scope.

## Cutover

The canonical plan is the Studio's `docs/03-guides/launch-2026-10-30.md`, and the
website's part is `docs/launch-cutover.md`. Don't merge to `main` until deployment
control is confirmed: a merge can auto-deploy ahead of the migrations.
