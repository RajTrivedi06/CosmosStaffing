import { NextResponse } from "next/server";
import { clientSession } from "@/lib/account/server";
import { ownerTag } from "@/lib/account/owner";

/**
 * Whose session this browser holds now, as the opaque tag the account pages
 * already carry. An open tab asks before it shows a private page again
 * (components/account/AccountPrivacy.tsx). It only compares: every page still
 * authorizes for itself.
 */
export async function GET() {
  const session = await clientSession();
  return NextResponse.json(
    {
      owner: session.state === "signed_in" ? ownerTag(session.client.id) : null,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
