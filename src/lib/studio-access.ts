import "server-only";
import { getVercelOidcToken } from "@vercel/oidc";
import type { NextRequest } from "next/server";
import { isApprovedStudio } from "@/lib/studio-routes";

/**
 * What a Vercel Preview may send, and where. Every Studio credential a Preview
 * holds (the service secret, a customer's token, its Trusted Sources token) goes
 * only to the one origin an operator approved in STUDIO_APPROVED_ORIGIN
 * (docs/protected-preview-access.md).
 *
 * The Trusted Sources token is only ever a request header added here, on the
 * server; never in browser code, a URL or a log. A redirect can't carry it
 * further: API calls refuse redirects, and the gateway hands them back to the
 * browser unfollowed. Where a redirect may lead is the Studio's to keep safe.
 */

/** What Vercel reads to let this Preview through the Studio's protection. */
const ADMISSION_HEADER = "x-vercel-trusted-oidc-idp-token";

/** Credentials only this server may send; a visitor's copy is never forwarded. */
const INFRASTRUCTURE_HEADERS = [
  "x-vercel-protection-bypass",
  "x-vercel-set-bypass-cookie",
  ADMISSION_HEADER,
  "x-vercel-oidc-token",
];

/** Vercel's own cookies: a tester's access to this site, not to the Studio. */
const INFRASTRUCTURE_COOKIE = /^_+vercel/i;

/** A way out of the forwarded path: encoded separators or dot segments. */
const PATH_ESCAPE = /%2e|%2f|%5c|\\|\/\.{1,2}(\/|$)/i;

/**
 * Whether this is the approved Studio. The rewrites are fixed at build time, so
 * the origin this build forwards to has to match as well as the one asked about.
 */
export function pairedStudio(destination: string) {
  return (
    isApprovedStudio(destination) &&
    isApprovedStudio(process.env.STUDIO_REWRITE_ORIGIN)
  );
}

/**
 * Headers for a request to this origin: none outside a Preview, and on a Preview
 * this request's own token, only for the approved Studio. Null means it can't
 * go, because a Preview that can't be admitted sends nothing rather than try
 * without. The helper reads Vercel's request context, not the visitor's headers.
 */
export async function studioAccessHeaders(
  destination: string,
): Promise<Record<string, string> | null> {
  if (process.env.VERCEL_ENV !== "preview") return {};
  if (!pairedStudio(destination)) return null;
  try {
    return { [ADMISSION_HEADER]: await getVercelOidcToken() };
  } catch {
    return null;
  }
}

/**
 * Prepares a request for the Studio rewrites: what the visitor sent is removed
 * on every host, and a Preview that doesn't match its approval, or has no token,
 * forwards nothing. Returns a status when the request must stop here.
 */
export async function prepareStudioRequest(
  request: Pick<NextRequest, "cookies" | "headers" | "nextUrl">,
): Promise<number | null> {
  for (const name of INFRASTRUCTURE_HEADERS) request.headers.delete(name);
  for (const { name } of request.cookies.getAll())
    if (INFRASTRUCTURE_COOKIE.test(name)) request.cookies.delete(name);
  if (PATH_ESCAPE.test(request.nextUrl.pathname)) return 404;
  const access = await studioAccessHeaders(
    process.env.STUDIO_REWRITE_ORIGIN ?? "",
  );
  if (!access) return 503;
  for (const [name, value] of Object.entries(access))
    request.headers.set(name, value);
  return null;
}
