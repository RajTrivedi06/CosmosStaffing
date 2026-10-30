import { z } from "zod";
import { quoteSchema } from "@/lib/quote";
import { deliverQuote } from "@/lib/quote-delivery";
import { quoteIntakeMode } from "@/lib/quote-intake";
import { attemptSchema } from "@/lib/quote-attempt";
import {
  deliverStudioQuote,
  studioTestConfiguration,
} from "@/lib/studio-intake";
import { quoteRateLimit, readQuoteBody } from "@/lib/quote-request-guard";
import { clientSession, verifiedAccess } from "@/lib/account/server";
import { OWNER_TAG, ownerTag } from "@/lib/account/owner";
import { deliverCustomerQuote } from "@/lib/customer-api";

const json = (
  body: object,
  status: number,
  headers: Record<string, string> = {},
) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      ...headers,
    },
  });
const facadeSchema = attemptSchema.extend({
  website: z.string().max(200).optional(),
  /** The intake version this attempt was made for (2: customer API). */
  version: z.literal(2).optional(),
  /** Which signed-in client's attempt this is (lib/account/owner.ts). */
  owner: z.string().regex(OWNER_TAG).optional(),
});
const legacySchema = quoteSchema
  .safeExtend({ website: z.string().max(200).optional() })
  .strict();

/**
 * The browser's Origin must name the host it sent the request to. Next can
 * normalise request.url's host (127.0.0.1 reads as localhost), so the Host
 * header the browser sent is checked too.
 */
function sameOrigin(origin: string, request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host");
  return (
    origin === url.origin || (!!host && origin === `${url.protocol}//${host}`)
  );
}

/** Browser facade. Exactly one destination, committed acknowledgments only. */
export async function POST(request: Request): Promise<Response> {
  const mode = quoteIntakeMode();
  const legacy = mode === "legacy";
  const customer = mode === "customer";
  if (!legacy && !customer && !studioTestConfiguration())
    return json({ ok: false, code: "studio_pending" }, 503);

  const retryAfter = quoteRateLimit(request);
  if (retryAfter)
    return json({ ok: false, code: "rate_limited" }, 429, {
      "Retry-After": String(retryAfter),
    });
  // JSON + same-origin checks deter cross-site browser submissions, not direct bots.
  if (request.headers.get("sec-fetch-site") === "cross-site")
    return json({ ok: false, code: "invalid_origin" }, 403);
  const origin = request.headers.get("origin");
  if (origin && !sameOrigin(origin, request))
    return json({ ok: false, code: "invalid_origin" }, 403);
  if (
    request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase() !== "application/json"
  )
    return json({ ok: false, code: "unsupported_media_type" }, 415);
  // With client accounts on, only a verified, signed-in client can send.
  // The quote screen keeps the answers and asks them to sign in again.
  // Customer intake always needs one: no session, no token, no send.
  const session = await clientSession();
  const access = customer ? await verifiedAccess() : null;
  if (
    session.state === "signed_out" ||
    session.state === "expired" ||
    (customer && !access)
  )
    return json({ ok: false, code: "sign_in_required" }, 401);
  const owner =
    session.state === "signed_in" ? ownerTag(session.client.id) : null;

  let payload: unknown;
  try {
    const raw = await readQuoteBody(request);
    if (raw === null) return json({ ok: false, code: "too_large" }, 413);
    payload = JSON.parse(raw);
  } catch {
    return json({ ok: false, code: "invalid" }, 400);
  }
  const parsed = facadeSchema.safeParse(payload);
  // Compatibility for legacy tabs already open at rollout. Studio requires a UUID.
  const old =
    legacy && !parsed.success ? legacySchema.safeParse(payload) : null;
  if (!parsed.success && !old?.success)
    return json({ ok: false, code: "invalid" }, 422);
  const data = parsed.success ? parsed.data : old!.data!;
  if (data.website) return json({ ok: false, code: "invalid" }, 422);
  // An attempt filed under another signed-in client is never sent as this one.
  if (parsed.success && parsed.data.owner && parsed.data.owner !== owner)
    return json({ ok: false, code: "account_mismatch" }, 409);
  if (customer) {
    // Only a v2 attempt made for this client; a v1 ID is never reused for v2.
    if (!parsed.success || parsed.data.version !== 2 || !parsed.data.owner)
      return json({ ok: false, code: "invalid" }, 422);
    const result = await deliverCustomerQuote(
      {
        submission_id: parsed.data.submission_id,
        answers: parsed.data.answers,
      },
      access!.token,
    );
    return json(result.body, result.status);
  }
  if (parsed.success && parsed.data.version === 2)
    return json({ ok: false, code: "invalid" }, 422);
  if (!legacy && parsed.success) {
    const result = await deliverStudioQuote(parsed.data);
    return json(result.body, result.status);
  }
  const answers = parsed.success
    ? parsed.data.answers
    : quoteSchema.parse(old!.data);
  const id = parsed.success ? parsed.data.submission_id : crypto.randomUUID();
  const { outcome } = await deliverQuote(answers, id);
  if (outcome === "sent") return json({ ok: true, id }, 200);
  return outcome === "not_configured"
    ? json({ ok: false, code: "not_configured" }, 503)
    : json({ ok: false, code: "delivery_failed" }, 502);
}
