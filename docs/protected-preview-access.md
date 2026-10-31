# Protected Preview access

How the website reaches a protected Studio Preview. For Internal Tools to
review and set up; the website side is built and stays inert until the variable
below exists. Both Previews stay protected throughout, and no credential goes
into browser code, URLs, logs, chat or a repository.

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
| Variable unset                          | No bypass header; the pairing check still applies      |
| Vercel Production                       | Never sends it, whatever is set                        |

**Which credentials this covers.** All of a Preview's: the bypass, the service
secret and the customer's token. The server sends `x-vercel-protection-bypass`
only as a request header.

- **Server calls:** `customer-api.ts` builds its headers explicitly and keeps
  `redirect: "error"`, so a redirect fails as unavailable and sends nothing.
- **Forwarded paths:** `src/proxy.ts` prepares the request and the normal
  `next.config.ts` rewrites forward it, so Preview tests the same rewrites
  production uses. There is no second gateway.
- **Redirects:** the gateway doesn't follow them. It returns them to the browser,
  which has never held the credential.

**On every host, including production:** the proxy now runs on the Studio's
forwarded paths and only does two things. It removes any inbound
`x-vercel-protection-bypass`, `x-vercel-set-bypass-cookie`,
`x-vercel-trusted-oidc-idp-token` and `x-vercel-oidc-token`, and returns 404 for
paths with encoded separators or dot segments. It does no session work there.

Rejected: putting the secret in a rewrite destination (it would be a URL, which
`connect-company-domain.md` forbids), turning protection off, and a preview-only
`NextResponse.rewrite` gateway (it wouldn't test the real rewrites).

**Trusted Sources.** Internal Tools prefers Vercel's Preview-to-Preview OIDC rule,
because a bypass secret covers every deployment in the Studio project. It isn't
built here: its availability on this team is unconfirmed, and it needs a small
dependency. If it's available, the token replaces the bypass inside
`studioAccessHeaders`, and the same origin check applies unchanged.

## Setup, for Internal Tools

Keep `STUDIO_PROTECTION_BYPASS` unset until the access method is agreed.

1. Choose Trusted Sources or a **dedicated** automation bypass secret named for
   this lease, so it can be revoked alone.
2. On the website Vercel project, Preview scope: set `STUDIO_APPROVED_ORIGIN` to
   the exact Studio Preview origin, and `STUDIO_ORIGIN` to the same value. Every
   Preview build fails without them, by design.
3. Set `STUDIO_CUSTOMER_API_URL` to that origin plus `/api/customer/v2`, and
   `NEXT_PUBLIC_SITE_URL` to the website Preview, before the build.
4. If a bypass is agreed, add `STUDIO_PROTECTION_BYPASS` with Preview scope,
   Sensitive. Never `NEXT_PUBLIC_`. Never Production.
5. Redeploy the website Preview after any change to these. If the Studio Preview
   origin changes, its approval and the build both have to change with it.
6. Revoke the credential when the Preview lease closes.

The tester needs separate access to the **website** Preview, for the browser
that opens emailed links. Use that project's own bypass secret, kept in a local
private env file, or a team login. Tests send it by header to the website origin
only, so it never reaches Supabase, Studio or a mail provider.

## What local checks prove, and what they can't

`tests/e2e/studio-access.spec.ts` and the unit tests show, against a stand-in
Studio: a mismatch sends nothing, forged inbound headers are removed, a redirect to
another host isn't followed, and a browser following one carries no credential. A
Preview-style build with a planted value had it in none of its output, including
source maps. Each protection was removed in turn to confirm its test fails.

None of that is hosted proof. These stay open until the first hosted run:

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
6. An upstream redirect to a separate capturing host receives no credential.
7. A request to the website Preview without tester access is still refused, and so
   is an unsigned direct request to the Studio Preview.
8. Rate-limit checks run without a bypass, since a bypass can skip those controls.

If Vercel drops the header on an external rewrite, stop and tell Internal Tools.
Don't lower protection to pass the test.
