import "server-only";
import type { NextRequest } from "next/server";
import { isApprovedStudio } from "@/lib/studio-routes";

/**
 * What a Vercel Preview may send, and where. Every Studio credential a Preview
 * holds (the service secret, a customer's token, the protection bypass) goes
 * only to the one origin an operator approved in STUDIO_APPROVED_ORIGIN
 * (docs/protected-preview-access.md).
 *
 * The bypass is only ever a request header added here, on the server; never in
 * browser code, a URL or a log. A redirect can't carry it further: API calls
 * refuse redirects, and the gateway hands them back to the browser unfollowed.
 */

/** Credentials only this server may send; a visitor's copy is never forwarded. */
const INFRASTRUCTURE_HEADERS = [
  "x-vercel-protection-bypass",
  "x-vercel-set-bypass-cookie",
  "x-vercel-trusted-oidc-idp-token",
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

/** The bypass header, only on a Preview and only for the approved origin. */
export function studioAccessHeaders(
  destination: string,
): Record<string, string> {
  const secret = process.env.STUDIO_PROTECTION_BYPASS;
  return process.env.VERCEL_ENV === "preview" &&
    pairedStudio(destination) &&
    secret
    ? { "x-vercel-protection-bypass": secret }
    : {};
}

/**
 * Prepares a request for the Studio rewrites: what the visitor sent is removed
 * on every host, and a Preview that doesn't match its approval forwards nothing.
 * Returns a status when the request must stop here.
 */
export function prepareStudioRequest(
  request: Pick<NextRequest, "cookies" | "headers" | "nextUrl">,
): number | null {
  for (const name of INFRASTRUCTURE_HEADERS) request.headers.delete(name);
  for (const { name } of request.cookies.getAll())
    if (INFRASTRUCTURE_COOKIE.test(name)) request.cookies.delete(name);
  if (PATH_ESCAPE.test(request.nextUrl.pathname)) return 404;
  if (process.env.VERCEL_ENV !== "preview") return null;
  const origin = process.env.STUDIO_REWRITE_ORIGIN ?? "";
  if (!pairedStudio(origin)) return 503;
  for (const [name, value] of Object.entries(studioAccessHeaders(origin)))
    request.headers.set(name, value);
  return null;
}
