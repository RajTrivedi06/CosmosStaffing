# Website prerequisite handoff — 2026-10-30

This commit separates P1 (Studio routing/recruitment) and P2 (quote intake and
usability) from Claude's paused authentication work, using its file/hunk
inventory. Parent: `6c21533`; branch: `feat/cosmos-staffing-site`.

## Included and preserved

- Exact public-route rewrite allowlist, Studio asset namespace and edge headers;
  invitation-led recruitment and its existing supporting styles/menu links.
- Removal of `src/app/(site)/terms/page.tsx`: `/terms` belongs to Studio.
- Existing questionnaire usability, native date control, draft/attempt recovery,
  immutable UUID/snapshot retries, committed acknowledgments and explicit conflict.
- Server-only intake v1 adapter, body limits, per-instance rate guard, same-origin
  normalization and synthetic tests. Legacy remains the default; Studio production
  delivery and the pending browser authentication boundary remain blocked.
- Prior paired v1 evidence in `paired-adapter-verification.md`; no new database run.

Excluded: all account routes/components/helpers/proxy, quote-handoff, auth hunks,
Supabase dependencies/lockfile/config/templates and authentication tests/docs;
all unrelated imagery, hero/navbar motion, scrolling and service-selector changes.
Only the earlier recruitment links/support styles are included in shared files.
The original working files are retained. The three pre-staged deletions remain
staged for the separate presentation change:

- `public/images/hero-wide.jpg`
- `public/images/home-day-tall.jpg`
- `public/images/home-eve-tall.jpg`

The unstaged `hero-tall.jpg` deletion also remains outside this commit. No local
credentials, generated output, migration or Studio files are included.

## Verification of the prerequisite snapshot

Verified in detached worktree `wt-website-prerequisite-review`, without the
uncommitted authentication or presentation changes. Unit tests: **118 passed**,
including the real implementation-worktree's v1 schema/fixture conformance test.
Lint, TypeScript, formatting and a Next production build passed. The selected
browser suite passed **64 tests** in legacy mode, with the two Studio-mode tests
intentionally skipped. In Studio mode those two checks passed **three times each**.
An initial desktop failure exposed a fixture hydration race: the helper seeded
sessionStorage before the initial draft-save effect completed. The helper now
waits for that save; no application behavior changed. Its six affected legacy
cases passed again after the correction. These checks use synthetic HTTP
fixtures and a local Studio stub, not real Auth or Studio persistence.

## Claude's next commit

Use this prerequisite commit as the base and resume as the sole authentication
implementation/staging owner. Stage only inventory group A and its auth hunks in
shared files. Do not include presentation group U or the staged image deletions.
Verify the proposed authentication snapshot in isolation before committing; the
mixed working tree's earlier checks do not establish that the A-only snapshot
builds. Supply its hash and diff for independent review. Do not implement a second
authentication stack or call the account UI authenticated Studio integration.

Update `docs/client-accounts.md`'s introduction, account-home description, intake
paragraph and final test caveat: the v2.1 contract is now published, although the
adapter/paired verification are still missing. Keep its historical local-Auth
results clearly separated from actual paired Studio evidence.

Independent review will cover refresh/expiry, recovery/reauthentication, logout,
account switching, private caching, draft recovery, server authorization and
fail-closed behavior. Review rate-limit deployment design separately from the
`VERCEL=1` test harness. Coordinate fixes through one implementation owner.

## Subsequent website adapter work — not implemented here

Canonical contract: `wt-integration-implementation/docs/03-guides/customer-auth-v2.md`,
revision 2.1, `cc738d2` on `feat/customer-auth-foundation`.

1. Server-only `STUDIO_CUSTOMER_API_URL` at the fixed `/api/customer/v2` base:
   POST `/intake` sends exactly `{version:2, submission_id, answers}` with no
   identity object. Supply `X-Webhook-Secret`, matching `Idempotency-Key`, and
   `Authorization: Bearer` from the request-scoped server session's access token.
   `getSession` may supply that token; its user is not authorization evidence.
   Studio independently verifies current identity, live session and ownership.
   Never forward browser cookies, authorization or host headers upstream.
2. Fail closed when auth configuration/session is missing. Retain committed
   202/new and 200/replay acknowledgment validation and explicit 409 handling;
   map 401, 403 `email_unverified`, indistinguishable 404, and 503 honestly.
   No legacy fallback or dual delivery. Do not bypass either production guard.
3. Bind drafts, localStorage handoffs and immutable attempts to the account and
   intake version. Preserve uncertain attempts; never silently assign a fresh
   ID, reuse a v1 UUID for v2, or submit another account's retained answers.
4. Replace the account-home `not_connected` placeholder using authenticated
   GET `/account`, `/requests` and `/requests/:request_id`. `linked:false` means
   no requests yet. Respect cursors and history `has_more`; acceptance is not a
   booking and a Stripe return is not payment confirmation. Other-owner records
   remain indistinguishable from missing records; no `wrong_account` API reason.
5. Complete secure both-address email change and callback handling, secure
   password-change reauthentication and deliberate recovery session revocation.
   Review shared email-template branching against staff/cleaner callbacks before
   hosted changes; appending `&token_hash` assumes a query already exists.
6. Preserve host-only HttpOnly `cosmos-client-auth` cookie chunks and refresh
   headers through `/q` and `/pay`. Do not refresh Studio paths in the website
   proxy or alter staff/cleaner cookie namespaces.

Before coordinated verification, reserve a new isolated paired environment with
one shared Auth/database project; Studio's previous slot is no longer an active
lease. Local website Auth tests alone do not verify Studio authorization. Hosted
Auth settings, reliable SMTP, distributed per-client abuse controls/trusted IP
handling, protected Preview/edge cookies/cache checks and coordinated migration
rehearsal remain release dependencies. No deployment, settings change or production
enablement is authorized by this handoff.
