/**
 * Paths owned by the Operations Studio (a separate Next.js app and Vercel
 * project). This site forwards them with rewrites, so the browser stays on the
 * company domain, and must never create its own pages at these paths.
 *
 * Copied exactly from the Studio's `docs/03-guides/connect-company-domain.md`
 * ("Vercel setup", step 4; ADR 0004). The Studio keeps a matching list of
 * recipient paths, so the two change together in one coordinated release:
 * never add, widen or guess a path here on its own. /login, /api and /_next
 * are never forwarded.
 *
 * The documented no-store/noindex headers for these paths are in vercel.json
 * (the guide's own location), where Vercel applies them to the forwarded
 * responses.
 */

/** The Studio's production origin, from the documented template. */
export const DEFAULT_STUDIO_ORIGIN = "https://studio.cosmosservicesllc.com";

/** Forwarded path patterns, in the documented order. */
export const STUDIO_PATHS = [
  "/pay/:path+",
  "/join/:path+",
  "/q/:path+",
  "/o/:path+",
  "/me",
  "/me/:path+",
  "/terms",
  "/studio-assets/_next/static/:path+",
] as const;

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * The origin to forward to. `STUDIO_ORIGIN` points paired previews at a
 * matching Studio preview (and tests at a local stub); unset, it is the
 * production Studio. Like the Studio's own base URLs it must be a bare
 * origin: HTTPS, or HTTP on loopback only. A malformed value fails the build.
 */
export function studioOrigin(value: string | undefined): string {
  if (!value) return DEFAULT_STUDIO_ORIGIN;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`STUDIO_ORIGIN is not a URL: ${value}`);
  }
  const secure =
    url.protocol === "https:" ||
    (url.protocol === "http:" && LOOPBACK.has(url.hostname));
  const bare =
    !url.username &&
    !url.password &&
    url.pathname === "/" &&
    !url.search &&
    !url.hash;
  if (!secure || !bare) {
    throw new Error(
      `STUDIO_ORIGIN must be an HTTPS origin with no path, query or credentials: ${value}`,
    );
  }
  return url.origin;
}

/** Hosts that are production's, whatever a Preview's settings say. */
const PRODUCTION_HOST =
  /(^|\.)cosmosservicesllc\.com$|^internal-tools-cosmos\.vercel\.app$/;

/**
 * The value only if it's already exactly a non-production origin, so that a
 * trailing slash, capitals or a default port can't match after tidying.
 */
export function pairedOrigin(value: string | undefined): string | null {
  try {
    const origin = value ? studioOrigin(value) : null;
    return origin === value && !PRODUCTION_HOST.test(new URL(origin).hostname)
      ? origin
      : null;
  } catch {
    return null;
  }
}

/** Whether this is exactly the Studio Preview an operator approved. */
export function isApprovedStudio(origin: string | undefined) {
  const approved = pairedOrigin(process.env.STUDIO_APPROVED_ORIGIN);
  return !!approved && origin === approved;
}

/** Rewrites for next.config, each path forwarded to the same path upstream. */
export function studioRewrites(origin: string) {
  return STUDIO_PATHS.map((path) => ({
    source: path,
    destination: `${origin}${path}`,
  }));
}
