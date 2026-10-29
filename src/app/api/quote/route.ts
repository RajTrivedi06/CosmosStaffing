import { quoteSchema } from "@/lib/quote";
import { deliverQuote } from "@/lib/quote-delivery";

/** Largest request body accepted, in bytes. A full quote is about 2 KB. */
const MAX_BODY = 16_000;
/** Requests allowed per IP address in each window. */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

// In-memory, so it only limits within one server instance. Put a shared store
// (or the host's rate limiting) in front of this before high-traffic launch.
const recent = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > RATE_LIMIT;
}

const json = (body: object, status: number) => Response.json(body, { status });

/**
 * POST /api/quote: receives a request from the quote screen, re-validates
 * every answer on the server, then stores it and emails it to the team (see
 * quote-delivery). Success is only reported once it was stored or emailed. Customer details
 * are never logged; logs carry a request id and the outcome.
 */
export async function POST(request: Request): Promise<Response> {
  const id = crypto.randomUUID().slice(0, 8);
  const log = (outcome: string) => console.info(`[quote ${id}] ${outcome}`);

  const raw = await request.text();
  if (raw.length > MAX_BODY) {
    log("rejected: body too large");
    return json({ ok: false, code: "too_large" }, 413);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    log("rejected: invalid json");
    return json({ ok: false, code: "invalid" }, 400);
  }

  // Honeypot: a field people never see. Bots that fill it get a quiet 200.
  if (
    typeof payload === "object" &&
    payload !== null &&
    "website" in payload &&
    (payload as { website: unknown }).website
  ) {
    log("dropped: honeypot");
    return json({ ok: true }, 200);
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    log("rejected: rate limited");
    return json({ ok: false, code: "rate_limited" }, 429);
  }

  const result = quoteSchema.safeParse(payload);
  if (!result.success) {
    log("rejected: validation");
    return json({ ok: false, code: "invalid" }, 422);
  }

  const { outcome, stored, emailed } = await deliverQuote(result.data, id);
  log(`${outcome} (stored: ${stored}, emailed: ${emailed})`);
  if (outcome === "sent") return json({ ok: true, id }, 200);
  if (outcome === "not_configured") {
    return json({ ok: false, code: "not_configured" }, 503);
  }
  return json({ ok: false, code: "delivery_failed" }, 502);
}
