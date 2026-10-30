/**
 * Where a client may be sent after signing in, confirming their email or
 * resetting their password. Only paths on this site that are listed here are
 * accepted; anything else, including every absolute or protocol-relative URL,
 * falls back to the account home. Never accept arbitrary redirect targets.
 */
export const ACCOUNT_HOME = "/account";

/** This site's own pages a client can return to. */
const WEBSITE = [/^\/account$/, /^\/quote$/];

/**
 * The Studio's client recipient pages (forwarded, see lib/studio-routes.ts).
 * A quote or payment link that needs a signed-in client sends them here and
 * back to that exact link. Tokens are random URL-safe strings.
 */
const STUDIO = [/^\/(q|pay)\/[A-Za-z0-9_-]{16,128}$/];

export function safeDestination(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 300) return null;
  // Only a bare path: no scheme, host, query, fragment, backslash or encoding
  // tricks. The patterns above match the whole string.
  return [...WEBSITE, ...STUDIO].some((pattern) => pattern.test(value))
    ? value
    : null;
}

export function destinationOr(value: unknown, fallback = ACCOUNT_HOME) {
  return safeDestination(value) ?? fallback;
}

/** Forwarded Studio pages need a full page load; next/link can't cross zones. */
export function isStudioDestination(path: string) {
  return STUDIO.some((pattern) => pattern.test(path));
}

/** Why a client was sent to sign in. Anything unknown reads as no reason. */
export const SIGN_IN_REASONS = [
  "signin_required",
  "session_expired",
  "wrong_account",
  "link_expired",
  "signed_out",
  "password_updated",
] as const;
export type SignInReason = (typeof SIGN_IN_REASONS)[number];

export function signInReason(value: unknown): SignInReason | null {
  return SIGN_IN_REASONS.find((reason) => reason === value) ?? null;
}

/** An account page that returns to `next` afterwards, optionally saying why. */
export function withNext(path: string, next: string, reason?: SignInReason) {
  const params = new URLSearchParams();
  if (next !== ACCOUNT_HOME) params.set("next", next);
  if (reason) params.set("reason", reason);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export const signInHref = (next: string, reason?: SignInReason) =>
  withNext("/account/login", next, reason);
