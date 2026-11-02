/**
 * Cloudflare Turnstile on the account forms (signing in, signing up, a new
 * confirmation link, password recovery). Supabase Auth checks each token with
 * the secret it holds; this site only shows the check and passes the token
 * on, so it keeps no secret. Unset, there's no check and no token, which suits
 * a project with CAPTCHA off: Auth ignores tokens until CAPTCHA is on.
 */

/** The hidden field Cloudflare adds to the form. */
export const CAPTCHA_FIELD = "cf-turnstile-response";

/** The public site key, read when the page renders, so it needs no rebuild. */
export function captchaSiteKey(): string | null {
  return process.env.TURNSTILE_SITE_KEY?.trim() || null;
}
