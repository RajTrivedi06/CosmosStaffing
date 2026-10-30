import { NextResponse, type NextRequest } from "next/server";
import { authClient } from "@/lib/account/server";
import { destinationOr, signInHref, withNext } from "@/lib/account/destination";

/**
 * Where the confirmation and password-reset emails land (Supabase's
 * token-hash flow). Verifying the link signs the client in on this device,
 * whichever tab or browser opened it, so a new client never has to sign in
 * again straight after confirming. Then on to their validated destination.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = destinationOr(searchParams.get("next"));
  // A relative Location keeps the client on the host they came in on, where
  // the session cookie was just set.
  const to = (path: string) =>
    new NextResponse(null, {
      status: 303,
      headers: {
        Location: path,
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });

  const supabase = await authClient();
  if (!supabase || !tokenHash || (type !== "email" && type !== "recovery"))
    return to(signInHref(next, "link_expired"));

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });
  if (error) {
    return to(
      type === "recovery"
        ? withNext("/account/forgot", next, "link_expired")
        : signInHref(next, "link_expired"),
    );
  }
  if (type === "recovery") return to(withNext("/account/reset", next));
  return to(next);
}
