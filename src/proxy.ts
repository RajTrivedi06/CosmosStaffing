import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import {
  SESSION_HEADER,
  authConfig,
  cookieOptions,
  hasSessionCookie,
} from "@/lib/account/config";
import { prepareStudioRequest } from "@/lib/studio-access";

/** This site's own pages; the matcher's other paths are the Studio's. */
const OWN_PATH = /^\/(account|quote|api\/quote)(\/|$)/;

/**
 * Keeps a client's session fresh on the pages that read it (Supabase's
 * documented Next.js setup). Server Components can't write cookies, so the
 * token is refreshed here and handed to both the page and the browser.
 *
 * Deliberately narrow: it never runs on marketing pages, which stay static.
 * On the Studio's forwarded paths (lib/studio-routes.ts) it does no session work
 * and only prepares the request (lib/studio-access.ts); the usual rewrites then
 * carry it on.
 */
export async function proxy(request: NextRequest) {
  if (!OWN_PATH.test(request.nextUrl.pathname)) {
    const refused = prepareStudioRequest(request);
    return refused
      ? new NextResponse(null, { status: refused })
      : NextResponse.next({ request });
  }

  // Only this proxy may set the mark; drop any copy that arrives from outside.
  request.headers.delete(SESSION_HEADER);
  const config = authConfig();
  if (!config) return NextResponse.next({ request });

  const written: { name: string; value: string; options: CookieOptions }[] = [];
  const noCache: Record<string, string> = {};
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookieOptions: cookieOptions(request.nextUrl.hostname),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list, cacheHeaders) {
        for (const cookie of list) {
          request.cookies.set(cookie.name, cookie.value);
          written.push(cookie);
        }
        Object.assign(noCache, cacheHeaders);
      },
    },
  });

  const hadSession = hasSessionCookie(request.cookies.getAll());
  const { data } = await supabase.auth.getClaims();
  // Tell the page a session ended, so it can say so instead of a bare sign-in.
  if (hadSession && !data?.claims)
    request.headers.set(SESSION_HEADER, "expired");

  const response = NextResponse.next({ request });
  for (const { name, value, options } of written)
    response.cookies.set(name, value, options);
  // A refreshed token must never be cached and served to someone else.
  for (const [key, value] of Object.entries(noCache))
    response.headers.set(key, value);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    "/account",
    "/account/:path*",
    "/quote",
    "/api/quote",
    // Written out because matchers must be literal; STUDIO_PATHS is the list.
    "/:flow(pay|join|q|o|me)/:path+",
    "/me",
    "/terms",
    "/studio-assets/_next/static/:path+",
  ],
};
