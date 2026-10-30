import "server-only";
import { createHash } from "node:crypto";

/**
 * A stable, opaque tag for a signed-in client, derived on the server from
 * their verified Auth user ID. The quote screen files that client's drafts
 * and send attempts under it, so another account on the same browser never
 * sees or sends them; /api/quote checks it against the live session. It is
 * not an identity for the Studio, which verifies the bearer token itself.
 */
export function ownerTag(userId: string) {
  return createHash("sha256")
    .update(`cosmos-quote-owner:${userId}`)
    .digest("hex")
    .slice(0, 32);
}

export const OWNER_TAG = /^[0-9a-f]{32}$/;
