# Protected Preview access

How the website reaches a protected Studio Preview. For Internal Tools to review
and set up. Both Previews stay protected throughout, and no credential goes into
browser code, URLs, logs, chat or a repository.

**The one supported method is Vercel Trusted Sources**, chosen in Internal Tools'
release checklist. There's no secret to create, and no fallback: if it can't work,
stop and report why. Don't set up an automation bypass in its place. Nothing has
been configured yet.

## The problem

Three kinds of traffic cross from the website Preview to the Studio Preview:

| Traffic                            | Path                                                     | Who can add a credential            |
| ---------------------------------- | -------------------------------------------------------- | ----------------------------------- |
| Customer API v2                    | Website server `fetch`                                   | The website server                  |
| Forwarded pages and Server Actions | Browser → website → rewrite → Studio                     | Only the website, never the browser |
| Studio assets                      | Browser → website → rewrite (`/studio-assets/_next/...`) | Only the website, never the browser |

Opening the Studio Preview directly isn't a substitute. The client session
cookie is host-only on the website origin, so `/q/...` must be tested through the
website, which is also the path production uses.

## Design

A single check decides where any Preview credential may go:
`src/lib/studio-access.ts`, using `STUDIO_APPROVED_ORIGIN`. That variable is the
operator's attestation of the one Studio Preview this website Preview pairs with.

**What must all match, exactly.** The API origin, `STUDIO_ORIGIN`, the origin the
build's rewrites were fixed to, and `STUDIO_APPROVED_ORIGIN`. A value that only
matches after tidying is refused: trailing slash, capitals, default port, path.
Production hosts are refused even if approved: `*.cosmosservicesllc.com` and
`internal-tools-cosmos.vercel.app`. There is no `*.vercel.app` trust.

| When                                    | What happens                                           |
| --------------------------------------- | ------------------------------------------------------ |
| Preview build doesn't match             | The build fails                                        |
| API origin doesn't match at runtime     | The customer API and v1 adapter are off; nothing sent  |
| Build's origin doesn't match at runtime | Forwarded paths return 503; nothing reaches any Studio |
| No token from Vercel                    | Nothing sent: forwarded paths 503, API unavailable     |
| Vercel Production                       | Never asks for or sends a token, whatever is set       |

**Which credentials this covers.** All of a Preview's: the Trusted Sources token,
the service secret and the customer's token. The token comes from
`getVercelOidcToken()` (`@vercel/oidc`) in each request's own context, is never
stored, and goes out only as the request header `x-vercel-trusted-oidc-idp-token`,
after the origin check. It adds to the Studio's own checks, and replaces none: the
customer's token and service secret are still required.

- **Server calls:** `customer-api.ts` builds its headers explicitly and keeps
  `redirect: "error"`, so a redirect fails as unavailable and sends nothing.
- **No token:** this is an infrastructure failure, so it never clears a customer's
  session or a quote attempt that hasn't been confirmed.
- **Forwarded paths:** `src/proxy.ts` prepares the request and the normal
  `next.config.ts` rewrites forward it, so Preview tests the same rewrites
  production uses. There is no second gateway.
- **Redirects:** the gateway doesn't follow them. It returns them to the browser,
  which has never held the credential.

**On every host, including production:** the proxy now runs on the Studio's
forwarded paths and only does two things. It removes any inbound
`x-vercel-protection-bypass`, `x-vercel-set-bypass-cookie`,
`x-vercel-trusted-oidc-idp-token` and `x-vercel-oidc-token` headers and Vercel's own
cookies, and returns 404 for paths with encoded separators or dot segments. It does
no session work there. Customer and cleaner cookies and Server Action headers pass
through unchanged.

**Redirects follow contract R2** in Internal Tools' release checklist. The site
doesn't filter an upstream `Location`, and passes a 3xx to the browser unchanged, as
long as no credential appears in it. That isn't an open-redirect exemption: the
Studio owns where its redirects go. They're relative paths or its configured public
origin, and customer `next` values stay limited to its own account, quote and
payment paths. So the Studio Preview must have `NEXT_PUBLIC_PUBLIC_BASE_URL` set to
this website Preview, or its login redirects land on the Studio's own host.

Two tests cover this. `tests/e2e/studio-access.spec.ts` uses a synthetic off-site
redirect to prove nothing leaks; that's a leak test, not approval of off-site
destinations. `tests/paired` follows the Studio's real redirects and proves they stay
on this site. A later Stripe checkout redirect needs its own payment review.

Website Codex accepts this design on conditions the hosted run has to meet. Its
terms are in `release-review-736faab.md`: if an approved setup sends a customer off
the website, the fix is at the source or a shared, reviewed gateway, not a waiver.

**If admission fails on the hosted Preview,** Vercel may answer with its own login
redirect, which shows the Studio Preview's hostname to the browser. It carries no
credential, and Studio code can't prevent it. Treat it as a failed check, not a pass.

Rejected: a bypass secret (it covers every deployment in the Studio project, and can
skip firewall checks), turning protection off, and a preview-only gateway (it
wouldn't test the real rewrites).

## Setup, for Internal Tools

Don't set `STUDIO_PROTECTION_BYPASS` or any other static credential.

1. On the Studio project, under Deployment Protection, Trusted Sources: add
   `cosmosstaffing` with one rule, Preview to Preview. No Production rule.
2. On the website project, confirm Secure Backend Access with OIDC Federation is on.
3. On the website project, Preview scope: set `STUDIO_APPROVED_ORIGIN` to the exact
   Studio Preview origin, and `STUDIO_ORIGIN` to the same value. Every Preview build
   fails without them, by design.
4. Set `STUDIO_CUSTOMER_API_URL` to that origin plus `/api/customer/v2`, and
   `NEXT_PUBLIC_SITE_URL` to the website Preview, before the build.
5. On the Studio Preview, set `NEXT_PUBLIC_PUBLIC_BASE_URL` to the website Preview
   and `STUDIO_BASE_URL` to the Studio Preview, before the build.
6. Don't set `VERCEL_OIDC_TOKEN` as a variable. A build-time token must not become
   runtime configuration.
7. Redeploy after any change to these. If the Studio Preview origin changes, its
   approval and the website build both have to change with it.

**Each project is built with the other's address, so settle the order first.** The
website fixes the Studio's origin at build, and the Studio fixes the website's. Two
per-deployment URLs can't each know the other in advance. Use the website's stable
Preview branch URL as `NEXT_PUBLIC_PUBLIC_BASE_URL`, build the Studio, then build the
website against the Studio's exact origin. Read the branch URL from Vercel, since
long names are shortened. Record both deployment IDs and commits as well as the URLs.

The tester needs separate access to the **website** Preview, for the browser
that opens emailed links. Use that project's own bypass secret, kept in a local
private env file, or a team login. Tests send it by header to the website origin
only, so it never reaches Supabase, Studio or a mail provider.

## What local checks prove, and what they can't

`tests/e2e/studio-access.spec.ts` and the unit tests show, against a stand-in
Studio: a mismatch or a missing token sends nothing, forged inbound headers are
removed, a redirect to another host isn't followed, and a browser following one
carries no credential. They use the real helper with a synthetic token from the
environment, so they can't show what Vercel's request context does.

None of that is hosted proof. These stay open until the first hosted run:

0. **Check this first.** `getVercelOidcToken()` returns a token inside `src/proxy.ts`
   on Vercel. Vercel documents it for Functions. An
   [open report](https://github.com/vercel/vercel/issues/13885) says the token was
   missing in Next.js middleware, and nothing confirms `proxy.ts` either way. If it's
   missing, every forwarded path returns 503 and the customer API still works. Stop
   and report that; don't weaken protection or add a second gateway unreviewed.
1. Studio answers `/api/customer/v2/account` from the website server, not Vercel's
   protection page.
2. `/q/<token>`, `/me/login`, `/terms` and `/studio-assets/_next/static/...` arrive
   through the website origin with Studio's own headers.
3. A Server Action POST through the gateway keeps `Next-Action`, cookies and
   redirects.
4. The credential appears in no response, redirect, page source, client bundle,
   URL or log.
5. Vercel's edge, not just `next start`, keeps the proxy's header on an external
   rewrite, removes forged headers, and doesn't follow an upstream redirect.
6. An upstream redirect to a separate capturing host receives no credential, and
   the Studio's real redirects stay on the website Preview. Capture both `Location`
   and Server Action redirects, for signed-out and expired sessions, successful
   actions, forged destinations, and missing or wrong admission.
7. A request to the website Preview without tester access is still refused. So is
   an unsigned direct request to the Studio Preview, and one with a forged token.
8. Rate-limit checks run without a bypass, since a bypass can skip those controls.

If Vercel drops the header on an external rewrite, stop and tell Internal Tools.
Don't lower protection to pass the test.
