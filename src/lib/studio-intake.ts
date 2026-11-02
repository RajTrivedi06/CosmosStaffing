import "server-only";
import {
  studioAcknowledgment,
  toStudioIntake,
  type QuoteAttempt,
} from "@/lib/quote-attempt";
import { readQuoteBody } from "@/lib/quote-request-guard";
import { pairedStudio } from "@/lib/studio-access";
import { isProductionHost } from "@/lib/studio-routes";

/** An explicit isolated test gate. Never enables the customer-auth UI. */
export function studioTestConfiguration(): {
  url: string;
  secret: string;
} | null {
  if (
    process.env.QUOTE_DELIVERY_MODE !== "studio" ||
    process.env.QUOTE_STUDIO_TEST_ENABLED !== "true" ||
    process.env.VERCEL_ENV === "production"
  )
    return null;
  const secret = process.env.WEBSITE_INTAKE_SECRET;
  if (!secret || secret.length < 24) return null;
  try {
    const url = new URL(process.env.STUDIO_INTAKE_URL || "");
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    const isolated =
      process.env.VERCEL_ENV === "preview"
        ? url.protocol === "https:" && pairedStudio(url.origin)
        : !process.env.VERCEL && !process.env.VERCEL_ENV && loopback;
    if (
      !isolated ||
      !["http:", "https:"].includes(url.protocol) ||
      url.pathname !== "/api/webhooks/website" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      isProductionHost(url.hostname)
    )
      return null;
    return { url: url.href, secret };
  } catch {
    return null;
  }
}

export async function deliverStudioQuote(attempt: QuoteAttempt) {
  const config = studioTestConfiguration();
  if (!config)
    return { status: 503, body: { ok: false, code: "studio_pending" } };
  let payload;
  try {
    payload = toStudioIntake(attempt);
  } catch {
    return { status: 422, body: { ok: false, code: "invalid" } };
  }
  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": config.secret,
        "Idempotency-Key": payload.submission_id,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 401 || response.status === 503)
      return { status: 503, body: { ok: false, code: "unavailable" } };
    const raw = await readQuoteBody(response);
    const body: unknown = raw === null ? null : JSON.parse(raw);
    const ack = studioAcknowledgment.safeParse(body);
    if ([200, 202].includes(response.status) && ack.success)
      return { status: response.status, body: ack.data };
    const code =
      body && typeof body === "object" && "code" in body ? body.code : null;
    if (response.status === 409 && code === "idempotency_conflict")
      return { status: 409, body: { ok: false, code: "idempotency_conflict" } };
    if ([400, 413, 415, 422].includes(response.status))
      return {
        status: response.status,
        body: {
          ok: false,
          code: response.status === 413 ? "too_large" : "invalid",
        },
      };
  } catch {
    /* Never expose upstream bodies, credentials, or errors. */
  }
  return { status: 502, body: { ok: false, code: "delivery_failed" } };
}
