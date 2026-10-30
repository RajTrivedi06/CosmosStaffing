import { readQuoteDraft, type QuoteDraft } from "@/lib/quote-draft";

/**
 * A reviewed quote waiting for its sender to sign in or create an account.
 * The usual draft lives in sessionStorage, which is per tab; the confirmation
 * email can open in a new tab, so the handoff uses localStorage instead.
 * It holds contact details, so it expires, is cleared once the request is
 * sent or the client signs out, and never travels in a URL.
 */
export const HANDOFF_KEY = "cosmos-quote-handoff";
export const HANDOFF_TTL_MS = 24 * 60 * 60 * 1000;

export function writeQuoteHandoff(draft: QuoteDraft, now = Date.now()) {
  return JSON.stringify({ version: 1, savedAt: now, draft });
}

export function readQuoteHandoff(
  raw: string | null,
  now = Date.now(),
): QuoteDraft | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const { version, savedAt, draft } = value as Record<string, unknown>;
    if (version !== 1 || typeof savedAt !== "number") return null;
    if (savedAt > now || now - savedAt > HANDOFF_TTL_MS) return null;
    return readQuoteDraft(JSON.stringify(draft));
  } catch {
    return null;
  }
}

/** Browser helpers. Storage can be blocked; every call fails quietly. */
export const quoteHandoff = {
  save(draft: QuoteDraft) {
    try {
      localStorage.setItem(HANDOFF_KEY, writeQuoteHandoff(draft));
      return true;
    } catch {
      return false;
    }
  },
  load() {
    try {
      const raw = localStorage.getItem(HANDOFF_KEY);
      const draft = readQuoteHandoff(raw);
      if (raw && !draft) localStorage.removeItem(HANDOFF_KEY);
      return draft;
    } catch {
      return null;
    }
  },
  clear() {
    try {
      localStorage.removeItem(HANDOFF_KEY);
    } catch {
      /* nothing stored */
    }
  },
};
