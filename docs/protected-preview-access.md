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

Vercel's Protection Bypass for Automation, sent as the
`x-vercel-protection-bypass` request header, added only by the website's server.

- **Server calls:** `src/lib/customer-api.ts` adds it to its explicitly built
  headers. The older v1 adapter (`src/lib/studio-intake.ts`) isn't part of this
  journey and doesn't send it.
- **Forwarded paths:** `src/proxy.ts` sets it on the request and the normal
  `next.config.ts` rewrite forwards it. There is no second gateway, so Preview
  tests the same rewrites production uses.
- **Production is untouched.** The proxy's Studio matchers need a `*.vercel.app`
  host, so company-domain traffic never runs them, and `studioAccessHeaders()`
  returns nothing unless `VERCEL_ENV` is `preview` and `STUDIO_ORIGIN` names a
  Studio other than production. Vercel Production ignores the variable even if
  someone sets it there.

Rejected: putting the secret in a rewrite destination (it would be a URL, which
`connect-company-domain.md` forbids), turning protection off, and a preview-only
`NextResponse.rewrite` gateway (it wouldn't test the real rewrites).

## Setup, for Internal Tools

1. On the Studio Vercel project, create a **dedicated** automation bypass secret
   named for this lease, so it can be revoked alone. A bypass secret opens every
   deployment in that project until revoked.
2. On the website Vercel project, add `STUDIO_PROTECTION_BYPASS`, **Preview scope
   only, Sensitive**, with that value. Never `NEXT_PUBLIC_`. Never Production.
3. Set `STUDIO_ORIGIN` and `STUDIO_CUSTOMER_API_URL` to the Studio Preview, and
   `NEXT_PUBLIC_SITE_URL` to the website Preview, before the website build.
   `STUDIO_ORIGIN` is read at build time.
4. Redeploy the website Preview after any change to these.
5. Revoke the secret when the Preview lease closes.

The tester needs separate access to the **website** Preview, for the browser
that opens emailed links. Use that project's own bypass secret, kept in a local
private env file, or a team login. Tests send it by header to the website origin
only, so it never reaches Supabase, Studio or a mail provider.

## What must be proved on the hosted Preview

Local checks can't show how Vercel's edge treats this, so these stay open until
the first hosted run:

1. Studio answers `/api/customer/v2/account` from the website server, not
   Vercel's protection page.
2. `/q/<token>`, `/me/login`, `/terms` and `/studio-assets/_next/static/...`
   arrive through the website origin with Studio's own headers.
3. A Server Action POST through the gateway keeps `Next-Action`, cookies and
   redirects.
4. The bypass header and value appear in no response, redirect, page source or
   client bundle.
5. A request to the website Preview without tester access is still refused, and
   so is a direct request to the Studio Preview.

If Vercel drops the header on an external rewrite, stop and tell Internal Tools.
Don't lower protection to pass the test.
