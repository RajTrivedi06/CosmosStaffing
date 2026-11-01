import { NextResponse } from "next/server";
import { clientSession } from "@/lib/account/server";
import { ownerTag } from "@/lib/account/owner";

const PRIVATE = { "Cache-Control": "private, no-store" };

/**
 * Whose session this browser holds now, as the opaque tag the account pages
 * already carry. An open tab asks before it shows a private page again
 * (components/account/AccountPrivacy.tsx). It only compares: every page still
 * authorizes for itself.
 *
 * Null means proven nobody. A cookie that can't be verified proves nothing,
 * since an Auth outage looks the same as an ended session, so that answers 503
 * and the tab goes on waiting rather than taking it for a sign-out.
 */
export async function GET() {
  const session = await clientSession();
  if (session.state === "signed_in")
    return NextResponse.json(
      { owner: ownerTag(session.client.id) },
      { headers: PRIVATE },
    );
  if (session.state === "signed_out")
    return NextResponse.json({ owner: null }, { headers: PRIVATE });
  return new NextResponse(null, { status: 503, headers: PRIVATE });
}
