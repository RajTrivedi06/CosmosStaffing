import "server-only";
import { createHash } from "node:crypto";

export const MAX_QUOTE_BYTES = 16_000;
const WINDOW_MS = 600_000;
// Bounded per-instance defense; shared Vercel WAF limits are a rollout prerequisite.
const recent = new Map<string, { count: number; expires: number }>();

export function quoteRateLimit(request: Request): number {
  const now = Date.now();
  for (const [key, value] of recent)
    if (value.expires <= now) recent.delete(key);
  // Only trust forwarding headers when the runtime is behind Vercel's proxy.
  // Local callers share a bucket; spoofed headers cannot create unbounded buckets.
  const address =
    process.env.VERCEL === "1"
      ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown"
      : "local";
  const key = createHash("sha256").update(address).digest("hex");
  const previous = recent.get(key);
  if (!previous && recent.size >= 10_000) return 600;
  const bucket = previous ?? { count: 0, expires: now + WINDOW_MS };
  recent.set(key, bucket);
  if (bucket.count >= 5) return Math.ceil((bucket.expires - now) / 1000);
  bucket.count += 1;
  return 0;
}

/** Bound bytes during reading, including chunked bodies and UTF-8. */
export async function readQuoteBody(
  request: Request | Response,
): Promise<string | null> {
  if (Number(request.headers.get("content-length")) > MAX_QUOTE_BYTES)
    return null;
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_QUOTE_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(body);
}
