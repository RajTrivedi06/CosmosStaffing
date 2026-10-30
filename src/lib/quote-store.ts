import {
  ATTEMPT_KEY,
  attemptSchema,
  readQuoteAttempt,
  type QuoteAttempt,
} from "@/lib/quote-attempt";
import { DRAFT_KEY, readQuoteDraft, type QuoteDraft } from "@/lib/quote-draft";
import { quoteHandoff } from "@/lib/quote-handoff";

/**
 * Where the quote screen keeps its work in this browser, and whose it is.
 *
 * - Anonymous: the tab's draft and send attempt (sessionStorage), plus a
 *   reviewed quote waiting for sign-in (lib/quote-handoff.ts). Never sent
 *   by a signed-in client unless they choose to adopt it.
 * - Owned by a signed-in client (their owner tag, lib/account/owner.ts):
 *   the tab's draft (sessionStorage) and their send attempt (localStorage,
 *   so every tab of theirs sees an unconfirmed one and none mints a new ID).
 *   Each is filed under the tag and the intake version; another account, or
 *   another intake version, never reads it.
 */
export type Intake = 1 | 2;

export const OWNED_DRAFT_PREFIX = "cosmos-quote-draft:";
export const OWNED_ATTEMPT_PREFIX = "cosmos-quote-attempt:";
/** An unconfirmed attempt is kept this long for an identical retry. */
export const OWNED_ATTEMPT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function writeOwnedAttempt(
  attempt: QuoteAttempt,
  owner: string,
  intake: Intake,
  now = Date.now(),
) {
  return JSON.stringify({ version: 1, owner, intake, savedAt: now, attempt });
}

export function readOwnedAttempt(
  raw: string | null,
  owner: string,
  intake: Intake,
  now = Date.now(),
): QuoteAttempt | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (
      value?.version !== 1 ||
      value.owner !== owner ||
      value.intake !== intake ||
      typeof value.savedAt !== "number" ||
      value.savedAt > now ||
      now - value.savedAt > OWNED_ATTEMPT_TTL_MS ||
      !attemptSchema.safeParse(value.attempt).success
    )
      return null;
    // The exact stored snapshot, never a re-derived one.
    return value.attempt as QuoteAttempt;
  } catch {
    return null;
  }
}

function otherIntake(raw: string, owner: string, intake: Intake) {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    return value?.owner === owner && value.intake !== intake;
  } catch {
    return false;
  }
}

export type QuoteSlots = {
  owner: string | null;
  loadDraft(): QuoteDraft | null;
  saveDraft(draft: QuoteDraft | null): boolean;
  /** `unreadable`: something is stored but can't be trusted. */
  loadAttempt(): { attempt: QuoteAttempt | null; unreadable: boolean };
  saveAttempt(attempt: QuoteAttempt): boolean;
  clearAttempt(): void;
  archiveAttempt(attempt: QuoteAttempt): boolean;
};

function storage(kind: "session" | "local") {
  return kind === "session" ? sessionStorage : localStorage;
}
function get(kind: "session" | "local", key: string) {
  try {
    return storage(kind).getItem(key);
  } catch {
    return null;
  }
}
function set(kind: "session" | "local", key: string, value: string | null) {
  try {
    if (value === null) storage(kind).removeItem(key);
    else storage(kind).setItem(key, value);
    return true;
  } catch {
    // Private mode or blocked storage: the flow still works, just unsaved.
    return false;
  }
}

/** The storage this screen uses for `owner` (null when signed out). */
export function quoteSlots(owner: string | null, intake: Intake): QuoteSlots {
  if (!owner)
    return {
      owner,
      loadDraft: () => readQuoteDraft(get("session", DRAFT_KEY)),
      saveDraft: (draft) =>
        set("session", DRAFT_KEY, draft ? JSON.stringify(draft) : null),
      loadAttempt: () => {
        const raw = get("session", ATTEMPT_KEY);
        const attempt = readQuoteAttempt(raw);
        return { attempt, unreadable: !!raw && !attempt };
      },
      saveAttempt: (attempt) =>
        set("session", ATTEMPT_KEY, JSON.stringify(attempt)),
      clearAttempt: () => void set("session", ATTEMPT_KEY, null),
      archiveAttempt: (attempt) =>
        set(
          "session",
          `${ATTEMPT_KEY}-archive-${attempt.submission_id}`,
          JSON.stringify(attempt),
        ) && set("session", ATTEMPT_KEY, null),
    };
  const draftKey = `${OWNED_DRAFT_PREFIX}${owner}`;
  const attemptKey = `${OWNED_ATTEMPT_PREFIX}${owner}`;
  return {
    owner,
    loadDraft: () => readQuoteDraft(get("session", draftKey)),
    saveDraft: (draft) =>
      set("session", draftKey, draft ? JSON.stringify(draft) : null),
    loadAttempt: () => {
      const raw = get("local", attemptKey);
      const attempt = readOwnedAttempt(raw, owner, intake);
      // A record for another intake version is never sent here, and isn't an
      // error for this screen either.
      return {
        attempt,
        unreadable: !!raw && !attempt && !otherIntake(raw, owner, intake),
      };
    },
    saveAttempt: (attempt) =>
      set("local", attemptKey, writeOwnedAttempt(attempt, owner, intake)),
    clearAttempt: () => void set("local", attemptKey, null),
    archiveAttempt: (attempt) =>
      set(
        "local",
        `${attemptKey}-archive-${attempt.submission_id}`,
        writeOwnedAttempt(attempt, owner, intake),
      ) && set("local", attemptKey, null),
  };
}

/**
 * Answers started while signed out: this tab's anonymous draft, or a
 * reviewed quote left waiting for sign-in. A signed-in client sees these
 * only as an offer to adopt them.
 */
export const anonymousWork = {
  load(): QuoteDraft | null {
    return readQuoteDraft(get("session", DRAFT_KEY)) ?? quoteHandoff.load();
  },
  clear() {
    set("session", DRAFT_KEY, null);
    quoteHandoff.clear();
  },
};

/** This tab's own drafts, which sessionStorage keeps from other tabs. */
export function forgetTabDrafts() {
  try {
    for (const key of Object.keys(sessionStorage))
      if (key.startsWith(OWNED_DRAFT_PREFIX)) sessionStorage.removeItem(key);
  } catch {
    /* nothing stored */
  }
}

/** Written on sign-out; other tabs hear it and drop what they're showing. */
export const SIGNED_OUT_SIGNAL = "cosmos-quote-signed-out";

/**
 * On sign-out: forget answers in this browser that another person could see
 * next. Drafts go (anonymous and this tab's owned ones), and other open tabs
 * are told to do the same. An unconfirmed send attempt stays, filed under its
 * owner and shown to nobody else, so signing back in can retry it with the
 * same ID instead of creating a duplicate.
 */
export function forgetOnSignOut() {
  anonymousWork.clear();
  forgetTabDrafts();
  set("local", SIGNED_OUT_SIGNAL, String(Date.now()));
}
