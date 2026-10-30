/**
 * Client accounts (email and password, via Supabase Auth). Server only: the
 * browser never talks to Supabase or sees a token, so the session cookies can
 * be HttpOnly.
 *
 * Production uses the Studio's Supabase project, with its publishable key
 * only (never a service-role key). Leave these unset until the Studio verifies
 * client identity and ownership (docs/client-accounts.md); accounts then read
 * as off. "Off" must never let Studio intake through unauthenticated.
 */
export type AuthConfig = { url: string; publishableKey: string };

/**
 * The session cookie's base name. It must differ from the Studio's default
 * `sb-<ref>-auth-token`: cleaners sign in on /me through this same host, and a
 * shared name would let one session overwrite the other.
 */
export const AUTH_COOKIE = "cosmos-client-auth";

/** Set by proxy.ts on a request whose session it could not refresh. */
export const SESSION_HEADER = "x-cosmos-client-session";

/** The session cookie, whole or in chunks (`name.0`, `name.1`, …). */
export function hasSessionCookie(list: { name: string }[]) {
  return list.some(
    ({ name }) =>
      name === AUTH_COOKIE || /^cosmos-client-auth\.\d+$/.test(name),
  );
}

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function isLoopbackHost(hostname: string) {
  return LOOPBACK.has(hostname);
}

export function authConfig(): AuthConfig | null {
  const url = process.env.AUTH_SUPABASE_URL?.trim();
  const publishableKey = process.env.AUTH_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) return null;
  try {
    const parsed = new URL(url);
    const secure =
      parsed.protocol === "https:" ||
      (parsed.protocol === "http:" && isLoopbackHost(parsed.hostname));
    if (!secure || parsed.username || parsed.password) return null;
    return { url: parsed.origin, publishableKey };
  } catch {
    return null;
  }
}

export const accountsEnabled = () => authConfig() !== null;

/**
 * Host-only (no Domain), Lax, HttpOnly, and Secure everywhere but a loopback
 * development host, where browsers may refuse Secure cookies over plain HTTP.
 */
export function cookieOptions(hostname: string) {
  return {
    name: AUTH_COOKIE,
    path: "/",
    sameSite: "lax" as const,
    httpOnly: true,
    secure: !isLoopbackHost(hostname),
  };
}
