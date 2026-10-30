import { carriedAnswers, type QuoteAnswers } from "@/lib/quote";
import type { QuoteDraft } from "@/lib/quote-draft";

/**
 * A signed-out visitor's choices, waiting while they sign in or create an
 * account. The usual draft lives in sessionStorage, which is per tab; the
 * confirmation email can open in a new tab, so the handoff uses localStorage.
 *
 * Only the allowlisted choices are ever stored here (carriedAnswers): no
 * ZIP code, date, notes or contact details, which are asked after sign-in.
 * Version 1 of this record held full answers, so anything but version 2 is
 * removed unread.
 */
export const HANDOFF_KEY = "cosmos-quote-handoff";
export const HANDOFF_TTL_MS = 24 * 60 * 60 * 1000;

export function writeQuoteHandoff(answers: QuoteAnswers, now = Date.now()) {
  return JSON.stringify({
    version: 2,
    savedAt: now,
    answers: carriedAnswers(answers),
  });
}

export function readQuoteHandoff(
  raw: string | null,
  now = Date.now(),
): QuoteDraft | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const { version, savedAt, answers } = value as Record<string, unknown>;
    if (version !== 2 || typeof savedAt !== "number") return null;
    if (savedAt > now || now - savedAt > HANDOFF_TTL_MS) return null;
    if (!answers || typeof answers !== "object") return null;
    const carried = carriedAnswers(answers as Partial<QuoteAnswers>);
    return carried.service ? { answers: carried, step: "review" } : null;
  } catch {
    return null;
  }
}

/** Browser helpers. Storage can be blocked; every call fails quietly. */
export const quoteHandoff = {
  save(answers: QuoteAnswers) {
    try {
      localStorage.setItem(HANDOFF_KEY, writeQuoteHandoff(answers));
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
