# Claude handoff: 736faab, October 31

> **Superseded on November 1** by `docs/claude-handoff-bb50858.md` in
> `/Users/raaj/Documents/CS/cosmos/wt-website-presentation`. Website Codex reviewed
> `736faab`. The sections below on redirects and the bypass no longer apply: the
> shared checklist settled redirects as contract R2 and chose Trusted Sources.

For Website Codex and Internal Tools. Nothing was pushed or deployed, no credential
exists, and production stays blocked. Branch `presentation/candidate-2026-10-30`,
worktree `/Users/raaj/Documents/CS/cosmos/wt-website-presentation`.

- **Runtime:** `736faab6ee70842412a4b080ad91ce970e90154f`
- **Docs pin:** the commit that adds this file, the branch head.
- **Please review:** `d05541c..736faab`

| Commit    | Change                                                   |
| --------- | -------------------------------------------------------- |
| `616a066` | Binds all Preview credentials to one approved origin     |
| `91e5c85` | Service lists: U.S. wording, examples, requestable tasks |
| `736faab` | Strips Vercel cookies; refuses wildcard approvals        |

## Findings from `release-review-d05541c.md` and Studio's release checklist

| Finding                                    | Status                                                                                                                                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1: credentials can reach a different host | Fixed. `STUDIO_APPROVED_ORIGIN` must exactly equal `STUDIO_ORIGIN`, the API origin and the origin fixed at build. It covers the bypass, the service secret and the customer token.                 |
| Production origin with a trailing slash    | Fixed. Values must already be exact, and production hosts are refused even if approved.                                                                                                            |
| P2: visitor credentials forwarded          | Fixed on every host and mode: four infrastructure headers and `_vercel*` cookies. Customer and cleaner cookies and action headers are kept.                                                        |
| Encoded path escapes                       | Fixed. 404 before forwarding.                                                                                                                                                                      |
| Wrong upstream at build or runtime         | Fixed. A Preview build fails; a mismatch at runtime returns 503, and the customer API and v1 adapter are off.                                                                                      |
| **P2: off-site redirects stay same-site**  | **Not enforced, on purpose.** See below.                                                                                                                                                           |
| Trusted Sources or bypass                  | **Open, for Internal Tools.** Only the bypass is built, and it must stay unset. If Trusted Sources is available, its token replaces the bypass inside `studioAccessHeaders`, under the same check. |

## Redirects: please rule on this

The credential can't follow a redirect. API calls use `redirect: "error"`, and a
real-fetch test shows a second host receives nothing. The gateway returns redirects
to the browser unfollowed, and a real browser following one to another host arrives
with no credential, in its headers or URL.

What isn't done is rewriting or refusing an off-site `Location`. Rewrites can't read
an upstream response, so enforcing it means replacing them with a custom gateway
that production wouldn't share, on the path carrying Server Actions and streaming.
Studio's forwarded routes only redirect to same-site paths, using its public origin.
The one off-site case is `/pay` checkout, which is off and would need an exception.

My call is that this doesn't justify a second gateway. If you still need it
enforced, say so and I'll build it as its own change.

## One change to note

The proxy now runs on Studio's forwarded paths on every host, including production.
That's new: `d05541c` limited it to `*.vercel.app`. Stripping forged headers on the
company domain requires it. It does no session work there.

## Results on `736faab`

ESLint, types and format clean, 349 unit, 122 main browser with 3 intentionally
skipped, 78 real local Auth, and five pages at desktop and emulated phone with no
overflow, broken images or placeholders. Rerun with machine load under 11.

- **Each protection was removed in turn** and its test failed: redirect refusal, API
  origin binding, header stripping, build-origin binding, path check, cookie
  stripping.
- **Credential scan:** a Preview-shaped build with a planted value had it in 0 of 536
  output files, including 140 source maps. The value did exist at build time.
- **Not done:** no paired run on this commit, and nothing hosted. All of this ran on
  `next start` against a stand-in Studio. Emulated phones only.

Pinning website `736faab` needs Studio `6ee14e3` or later. Revision 2.3 doesn't change
the website: it never calls the acceptance API.

## Internal Tools

1. Replace `d05541c` with `736faab` in Studio's release docs once reviewed.
2. Decide Trusted Sources or the fallback. Setup steps are in
   `docs/protected-preview-access.md`. Every website Preview build now needs
   `STUDIO_APPROVED_ORIGIN` and an equal `STUDIO_ORIGIN`, or it fails.
3. The seeded Cleaner Agreement still needs resolving before a real cleaner signs.
