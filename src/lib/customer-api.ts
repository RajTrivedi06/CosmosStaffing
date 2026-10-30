import "server-only";
import { z } from "zod";
import { studioAcknowledgment, toStudioIntake } from "@/lib/quote-attempt";
import type { QuoteAttempt } from "@/lib/quote-attempt";
import {
  accountSchema,
  customerErrorSchema,
  customerIntakeSchema,
  requestDetailSchema,
  requestsSchema,
} from "@/lib/customer-api-contract";

/**
 * The Studio's customer API v2 (contract revision 2.1), called only from this
 * site's server with the signed-in client's access token and the server
 * credential. Studio verifies the token, the live session and ownership on
 * every call; nothing the browser sends is passed on as identity.
 *
 * Off unless explicitly enabled for an isolated test or protected Preview,
 * and never on Vercel Production: production enablement is a separate,
 * reviewed release change. Configuration names:
 * QUOTE_STUDIO_TEST_ENABLED, STUDIO_CUSTOMER_API_URL (the fixed
 * Studio origin plus /api/customer/v2), WEBSITE_INTAKE_SECRET.
 */
export function customerApiConfig(): { base: string; secret: string } | null {
  if (
    process.env.QUOTE_STUDIO_TEST_ENABLED !== "true" ||
    process.env.VERCEL_ENV === "production"
  )
    return null;
  const secret = process.env.WEBSITE_INTAKE_SECRET;
  if (!secret || secret.length < 24) return null;
  try {
    const url = new URL(process.env.STUDIO_CUSTOMER_API_URL || "");
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    const isolated =
      process.env.VERCEL_ENV === "preview"
        ? url.protocol === "https:"
        : !process.env.VERCEL_ENV && loopback;
    if (
      !isolated ||
      !["http:", "https:"].includes(url.protocol) ||
      url.pathname !== "/api/customer/v2" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      /(^|\.)cosmosservicesllc\.com$/.test(url.hostname)
    )
      return null;
    return { base: url.href, secret };
  } catch {
    return null;
  }
}

/** Studio's answers can be long (50 quotes and payments); still bounded. */
const MAX_RESPONSE_BYTES = 262_144;

type Call = { status: number; body: unknown } | null;

async function call(
  path: string,
  token: string,
  init: {
    method?: "GET" | "POST";
    body?: object;
    idempotencyKey?: string;
  } = {},
): Promise<Call> {
  const config = customerApiConfig();
  if (!config) return null;
  // Explicitly constructed: never the browser's cookies, auth or host headers.
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "X-Webhook-Secret": config.secret,
  };
  if (init.body) headers["Content-Type"] = "application/json";
  if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;
  try {
    const response = await fetch(`${config.base}${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    const raw = await readBounded(response);
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      body = null;
    }
    return { status: response.status, body };
  } catch {
    /* Transport failure: the caller decides; nothing upstream is exposed. */
    return { status: 0, body: null };
  }
}

async function readBounded(response: Response): Promise<string | null> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

const codeOf = (body: unknown) => {
  const parsed = customerErrorSchema.safeParse(body);
  return parsed.success ? parsed.data.code : null;
};

export type IntakeResult = { status: number; body: object };

/**
 * Sends one immutable attempt as intake v2. Success only on Studio's
 * committed acknowledgment (202 new, 200 identical replay). Every other
 * answer keeps the attempt for a retry with the same ID; nothing falls back
 * to another destination.
 */
export async function deliverCustomerQuote(
  attempt: QuoteAttempt,
  token: string,
): Promise<IntakeResult> {
  if (!customerApiConfig())
    return { status: 503, body: { ok: false, code: "studio_pending" } };
  let payload;
  try {
    payload = customerIntakeSchema.parse({
      version: 2,
      submission_id: attempt.submission_id,
      answers: toStudioIntake(attempt).answers,
    });
  } catch {
    return { status: 422, body: { ok: false, code: "invalid" } };
  }
  const result = await call("/intake", token, {
    method: "POST",
    body: payload,
    idempotencyKey: payload.submission_id,
  });
  if (!result || result.status === 0)
    return { status: 502, body: { ok: false, code: "delivery_failed" } };
  const { status, body } = result;
  const ack = studioAcknowledgment.safeParse(body);
  if ((status === 200 || status === 202) && ack.success)
    return { status, body: ack.data };
  const code = codeOf(body);
  if (status === 401)
    return { status: 401, body: { ok: false, code: "sign_in_required" } };
  if (status === 403 && code === "email_unverified")
    return { status: 403, body: { ok: false, code: "email_unverified" } };
  if (status === 409 && code === "idempotency_conflict")
    return { status: 409, body: { ok: false, code: "idempotency_conflict" } };
  if ([400, 413, 415, 422].includes(status))
    return {
      status,
      body: { ok: false, code: status === 413 ? "too_large" : "invalid" },
    };
  if (status === 503)
    return { status: 503, body: { ok: false, code: "unavailable" } };
  // Malformed acknowledgment, 404 or anything unexpected: the request may or
  // may not be saved, so the attempt is kept for an identical retry.
  return { status: 502, body: { ok: false, code: "delivery_failed" } };
}

/** What an account read can come back with. Never a guess. */
export type Read<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      reason:
        | "off"
        | "unauthorized"
        | "unverified"
        | "not_found"
        | "unavailable";
    };

function read<T>(result: Call, parse: (body: unknown) => T | null): Read<T> {
  if (!result) return { ok: false, reason: "off" };
  const { status, body } = result;
  if (status === 200) {
    const data = parse(body);
    return data === null
      ? { ok: false, reason: "unavailable" }
      : { ok: true, data };
  }
  if (status === 401) return { ok: false, reason: "unauthorized" };
  if (status === 403 && codeOf(body) === "email_unverified")
    return { ok: false, reason: "unverified" };
  // Missing and someone else's look the same, by design.
  if (status === 404) return { ok: false, reason: "not_found" };
  return { ok: false, reason: "unavailable" };
}

const okWith = <T extends z.ZodType>(key: string, schema: T) => {
  const envelope = z.object({ ok: z.literal(true), [key]: schema });
  return (body: unknown): z.infer<T> | null => {
    const parsed = envelope.safeParse(body);
    return parsed.success
      ? (parsed.data as Record<string, z.infer<T>>)[key]
      : null;
  };
};

export async function readAccount(token: string) {
  return read(await call("/account", token), okWith("account", accountSchema));
}

/**
 * Studio's cursors are `<Postgres timestamp text>|<uuid>`, e.g.
 * `2026-10-30 14:02:11.5+00|…`. Anything else is dropped.
 */
export function safeCursor(value: unknown): string | null {
  return typeof value === "string" &&
    value.length <= 100 &&
    /^[0-9][0-9 :.+\-T]{9,40}\|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
    ? value
    : null;
}

export async function readRequests(
  token: string,
  cursor: string | null,
  limit = 20,
) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  const envelope = z.object({ ok: z.literal(true) }).and(requestsSchema);
  return read(await call(`/requests?${query}`, token), (body) => {
    const parsed = envelope.safeParse(body);
    return parsed.success
      ? { items: parsed.data.items, next_cursor: parsed.data.next_cursor }
      : null;
  });
}

export async function readRequest(token: string, requestId: string) {
  if (!z.uuid().safeParse(requestId).success)
    return { ok: false, reason: "not_found" } as const;
  return read(
    await call(`/requests/${requestId.toLowerCase()}`, token),
    okWith("request", requestDetailSchema),
  );
}
