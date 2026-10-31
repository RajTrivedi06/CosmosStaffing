import "server-only";
import { DEFAULT_STUDIO_ORIGIN } from "@/lib/studio-routes";

/**
 * The website server's way through Vercel's protection on a paired Studio
 * Preview (docs/protected-preview-access.md). Only ever a request header added
 * here, on the server; never in browser code, a URL or a log.
 *
 * Empty everywhere except a Vercel Preview forwarding to a Studio other than
 * production, so STUDIO_PROTECTION_BYPASS does nothing if it's set anywhere else.
 */
export function studioAccessHeaders(): Record<string, string> {
  const origin = process.env.STUDIO_ORIGIN;
  const secret = process.env.STUDIO_PROTECTION_BYPASS;
  const paired =
    process.env.VERCEL_ENV === "preview" &&
    !!origin &&
    origin !== DEFAULT_STUDIO_ORIGIN;
  return paired && secret ? { "x-vercel-protection-bypass": secret } : {};
}
