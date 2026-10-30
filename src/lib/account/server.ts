import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { siteConfig } from "@/lib/site";
import {
  SESSION_HEADER,
  authConfig,
  cookieOptions,
  hasSessionCookie,
  isClientAuthCookie,
  isLoopbackHost,
} from "./config";

/** The signed-in client, as verified from their session token. */
export type Client = { id: string; email: string };

export type ClientSession =
  | { state: "off" }
  | { state: "signed_out" }
  /** A session cookie arrived but could not be verified or refreshed. */
  | { state: "expired" }
  | { state: "signed_in"; client: Client };

/** This site's origin for links in emails: the canonical URL, or loopback in development. */
export async function siteOrigin() {
  const list = await headers();
  const host = list.get("host") ?? "";
  const hostname = host.replace(/:\d+$/, "");
  if (isLoopbackHost(hostname)) return `http://${host}`;
  return new URL(siteConfig.url).origin;
}

/**
 * A Supabase client bound to this request's cookies, for Server Components,
 * Server Actions and Route Handlers. Null when accounts are off.
 */
export async function authClient() {
  const config = authConfig();
  if (!config) return null;
  const store = await cookies();
  const host = (await headers()).get("host") ?? "";
  return createServerClient(config.url, config.publishableKey, {
    cookieOptions: cookieOptions(host.replace(/:\d+$/, "")),
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list)
            store.set(name, value, options);
        } catch {
          // Server Components can't write cookies; proxy.ts refreshes them.
        }
      },
    },
  });
}

/**
 * Forgets the client session on this device: expires every cookie in its
 * namespace, whatever the Auth provider said. Other roles' cookies stay.
 */
export async function clearClientCookies() {
  const store = await cookies();
  const hostname = ((await headers()).get("host") ?? "").replace(/:\d+$/, "");
  const { name: _, ...options } = cookieOptions(hostname);
  void _;
  for (const { name } of store.getAll())
    if (isClientAuthCookie(name))
      store.set(name, "", { ...options, maxAge: 0 });
}

/** Who is signed in. Always verified (getClaims), never read from the cookie alone. */
export async function clientSession(): Promise<ClientSession> {
  const supabase = await authClient();
  if (!supabase) return { state: "off" };
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (claims?.sub && typeof claims.email === "string")
    return {
      state: "signed_in",
      client: { id: claims.sub, email: claims.email },
    };
  // proxy.ts marks a request whose session cookie it could not refresh (and
  // so cleared). The mark only chooses wording; it grants nothing.
  const expired =
    (await headers()).get(SESSION_HEADER) === "expired" ||
    hasSessionCookie((await cookies()).getAll());
  return { state: expired ? "expired" : "signed_out" };
}
