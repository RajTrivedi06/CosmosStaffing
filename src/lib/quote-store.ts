import { z } from "zod";
import {
  ATTEMPT_KEY,
  attemptSchema,
  readQuoteAttempt,
  type QuoteAttempt,
} from "@/lib/quote-attempt";
import { DRAFT_KEY, readQuoteDraft, type QuoteDraft } from "@/lib/quote-draft";
import { quoteHandoff } from "@/lib/quote-handoff";
import { carriedAnswers } from "@/lib/quote";

/**
 * Where the quote screen keeps its work in this browser, and whose it is.
 *
 * - Anonymous, client accounts on: only the allowlisted choices
 *   (carriedAnswers), in the tab's draft and the sign-in handoff
 *   (lib/quote-handoff.ts). Never sent by a signed-in client unless they
 *   choose to adopt them.
 * - Anonymous, client accounts off: the tab's draft and send attempt.
 * - Owned by a signed-in client (their owner tag, lib/account/owner.ts):
 *   the tab's draft (sessionStorage) and their send attempt (localStorage,
 *   so every tab of theirs sees an unconfirmed one and none mints a new ID).
 *   Each is filed under the tag and the intake version; another account, or
 *   another intake version, never reads it.
 *
 * An attempt's answers stay only while its owner is signed in here and for
 * OWNED_ATTEMPT_TTL_MS. On sign-out, an ended session, expiry or archival they
 * are replaced by an unresolved marker: the submission ID and when it was
 * made, nothing the client entered. The next send from that account reuses
 * the ID, so the Studio can match it to the original and never add a second
 * request (lib/customer-api.ts). The outcome stays unknown until then.
 */
export type Intake = 1 | 2;

export const OWNED_DRAFT_PREFIX = "cosmos-quote-draft:";
export const OWNED_ATTEMPT_PREFIX = "cosmos-quote-attempt:";
const ARCHIVE_INFIX = "-archive-";
/** An unconfirmed attempt's answers are kept this long for an identical retry. */
export const OWNED_ATTEMPT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** A marker is a reminder, and stops reserving its ID after this long. */
export const UNRESOLVED_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** An attempt whose outcome is unknown: its ID, never its answers. */
export type UnresolvedAttempt = { submission_id: string; savedAt: number };

type StoredRecord = Record<string, unknown>;

function parseRecord(raw: string | null): StoredRecord | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" ? (value as StoredRecord) : null;
  } catch {
    return null;
  }
}

export function writeOwnedAttempt(
  attempt: QuoteAttempt,
  owner: string,
  intake: Intake,
  now = Date.now(),
  /** Reuses a marker's ID, so a conflict means the original arrived. */
  resumed = false,
) {
  return JSON.stringify({
    version: 1,
    owner,
    intake,
    savedAt: now,
    attempt,
    ...(resumed ? { resumed } : {}),
  });
}

export function readOwnedAttempt(
  raw: string | null,
  owner: string,
  intake: Intake,
  now = Date.now(),
): QuoteAttempt | null {
  const value = parseRecord(raw);
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
}

export function writeUnresolved(
  submission_id: string,
  owner: string,
  intake: Intake,
  savedAt = Date.now(),
) {
  return JSON.stringify({ version: 2, owner, intake, savedAt, submission_id });
}

export function readUnresolved(
  raw: string | null,
  owner: string,
  intake: Intake,
  now = Date.now(),
): UnresolvedAttempt | null {
  const value = parseRecord(raw);
  if (
    value?.version !== 2 ||
    value.owner !== owner ||
    value.intake !== intake ||
    typeof value.savedAt !== "number" ||
    value.savedAt > now ||
    now - value.savedAt > UNRESOLVED_TTL_MS ||
    !z.uuid().safeParse(value.submission_id).success
  )
    return null;
  return {
    submission_id: value.submission_id as string,
    savedAt: value.savedAt,
  };
}

/** A stored record's ID, from either shape, whatever else is wrong with it. */
function storedId(value: StoredRecord | null) {
  const attempt = value?.attempt as StoredRecord | undefined;
  const id = value?.submission_id ?? attempt?.submission_id;
  return z.uuid().safeParse(id).success ? (id as string) : null;
}

/** The marker that replaces a record, or null when it has no usable ID. */
function retired(
  value: StoredRecord | null,
  owner: string,
  now: number,
): string | null {
  const id = storedId(value);
  if (!id) return null;
  const intake = value?.intake === 1 ? 1 : 2;
  const savedAt =
    typeof value?.savedAt === "number" && value.savedAt <= now
      ? value.savedAt
      : now;
  return now - savedAt > UNRESOLVED_TTL_MS
    ? null
    : writeUnresolved(id, owner, intake, savedAt);
}

function otherIntake(raw: string, owner: string, intake: Intake) {
  const value = parseRecord(raw);
  return value?.owner === owner && value.intake !== intake;
}

export type QuoteSlots = {
  owner: string | null;
  loadDraft(): QuoteDraft | null;
  saveDraft(draft: QuoteDraft | null): boolean;
  /**
   * `attempt`: answers to retry exactly. `unresolved`: only the ID is left.
   * `resumed`: `attempt` reuses a marker's ID. `unreadable`: something was
   * stored that can't be trusted, and is gone now.
   */
  loadAttempt(): {
    attempt: QuoteAttempt | null;
    unresolved: UnresolvedAttempt | null;
    resumed: boolean;
    unreadable: boolean;
  };
  saveAttempt(attempt: QuoteAttempt, resumed?: boolean): boolean;
  clearAttempt(): void;
  /** Sets the attempt aside under its marker, so a new one can start. */
  archiveAttempt(submission_id: string): boolean;
  /** Takes this slot's answers out of storage, leaving the marker. */
  retireAttempt(): void;
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
function keys(kind: "session" | "local") {
  try {
    const list = storage(kind);
    return Array.from({ length: list.length }, (_, i) => list.key(i)).filter(
      (key): key is string => key !== null,
    );
  } catch {
    return [];
  }
}

const noAttempt = {
  attempt: null,
  unresolved: null,
  resumed: false,
  unreadable: false,
};

/** The anonymous tab's draft, reduced to what a signed-out visitor keeps. */
function anonymousDraft(): QuoteDraft | null {
  const draft = readQuoteDraft(get("session", DRAFT_KEY));
  if (!draft) return null;
  const answers = carriedAnswers(draft.answers);
  return answers.service ? { answers, step: draft.step } : null;
}

/**
 * The storage this screen uses for `owner` (null when signed out).
 * `accountsOn`: a signed-out visitor keeps only allowlisted choices and has no
 * attempts, because only a signed-in client can send.
 */
export function quoteSlots(
  owner: string | null,
  intake: Intake,
  accountsOn = false,
): QuoteSlots {
  if (!owner)
    return {
      owner,
      loadDraft: () =>
        accountsOn
          ? anonymousDraft()
          : readQuoteDraft(get("session", DRAFT_KEY)),
      saveDraft: (draft) =>
        set(
          "session",
          DRAFT_KEY,
          draft
            ? JSON.stringify(
                accountsOn
                  ? { ...draft, answers: carriedAnswers(draft.answers) }
                  : draft,
              )
            : null,
        ),
      loadAttempt: () => {
        if (accountsOn) return noAttempt;
        const raw = get("session", ATTEMPT_KEY);
        const attempt = readQuoteAttempt(raw);
        return { ...noAttempt, attempt, unreadable: !!raw && !attempt };
      },
      saveAttempt: (attempt) =>
        set("session", ATTEMPT_KEY, JSON.stringify(attempt)),
      clearAttempt: () => void set("session", ATTEMPT_KEY, null),
      archiveAttempt: (id) =>
        set(
          "session",
          `${ATTEMPT_KEY}${ARCHIVE_INFIX}${id}`,
          JSON.stringify({ submission_id: id, savedAt: Date.now() }),
        ) && set("session", ATTEMPT_KEY, null),
      retireAttempt: () => void set("session", ATTEMPT_KEY, null),
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
      if (!raw) return noAttempt;
      // A record for another intake version is never sent here, and isn't an
      // error for this screen either.
      if (otherIntake(raw, owner, intake)) return noAttempt;
      const attempt = readOwnedAttempt(raw, owner, intake);
      if (attempt)
        return {
          ...noAttempt,
          attempt,
          resumed: parseRecord(raw)?.resumed === true,
        };
      const unresolved = readUnresolved(raw, owner, intake);
      if (unresolved) return { ...noAttempt, unresolved };
      // Expired or damaged: its answers can't stay, whatever else is true.
      const marker = retired(parseRecord(raw), owner, Date.now());
      set("local", attemptKey, marker);
      return {
        ...noAttempt,
        unresolved: readUnresolved(marker, owner, intake),
        unreadable: !marker,
      };
    },
    saveAttempt: (attempt, resumed = false) =>
      set(
        "local",
        attemptKey,
        writeOwnedAttempt(attempt, owner, intake, Date.now(), resumed),
      ),
    clearAttempt: () => void set("local", attemptKey, null),
    archiveAttempt: (id) =>
      set(
        "local",
        `${attemptKey}${ARCHIVE_INFIX}${id}`,
        writeUnresolved(id, owner, intake),
      ) && set("local", attemptKey, null),
    retireAttempt: () =>
      void set(
        "local",
        attemptKey,
        retired(parseRecord(get("local", attemptKey)), owner, Date.now()),
      ),
  };
}

/**
 * Choices made while signed out: this tab's anonymous draft, or a handoff left
 * waiting for sign-in. A signed-in client sees these only as an offer to adopt
 * them. Only allowlisted choices leave here, however they were stored.
 */
export const anonymousWork = {
  load(): QuoteDraft | null {
    return anonymousDraft() ?? quoteHandoff.load();
  },
  clear() {
    set("session", DRAFT_KEY, null);
    quoteHandoff.clear();
  },
};

/** This tab's own drafts, which sessionStorage keeps from other tabs. */
export function forgetTabDrafts(except?: string) {
  for (const key of keys("session"))
    if (
      key.startsWith(OWNED_DRAFT_PREFIX) &&
      key !== `${OWNED_DRAFT_PREFIX}${except}`
    )
      set("session", key, null);
}

/**
 * Leaves in this browser only what may stay for whoever is signed in here:
 * `current` is their owner tag, null for nobody, undefined when that isn't
 * known here (a marketing page, or client accounts off).
 *
 * Always: expired answers become markers, archives hold nothing but markers,
 * expired markers go, and a handoff in the old full format goes. With a known
 * session: answers belonging to anyone else become markers, other accounts'
 * tab drafts go, and a signed-out tab keeps only allowlisted choices.
 */
export function settleQuoteStorage(current?: string | null, now = Date.now()) {
  quoteHandoff.load();
  for (const key of keys("local")) {
    if (!key.startsWith(OWNED_ATTEMPT_PREFIX)) continue;
    const [owner, archived] = key
      .slice(OWNED_ATTEMPT_PREFIX.length)
      .split(ARCHIVE_INFIX);
    const raw = get("local", key);
    const value = parseRecord(raw);
    if (value?.version === 2) {
      const live =
        typeof value.savedAt === "number" &&
        now - value.savedAt <= UNRESOLVED_TTL_MS;
      if (!live) set("local", key, null);
      continue;
    }
    const mine = !archived && (current === undefined || current === owner);
    const fresh =
      typeof value?.savedAt === "number" &&
      value.savedAt <= now &&
      now - value.savedAt <= OWNED_ATTEMPT_TTL_MS;
    if (mine && (fresh || !storedId(value))) continue; // loadAttempt reports it
    set("local", key, retired(value, owner, now));
  }
  for (const key of keys("session")) {
    if (!key.startsWith(`${ATTEMPT_KEY}${ARCHIVE_INFIX}`)) continue;
    const id = storedId(parseRecord(get("session", key)));
    set(
      "session",
      key,
      id ? JSON.stringify({ submission_id: id, savedAt: now }) : null,
    );
  }
  if (current === undefined) return;
  forgetTabDrafts(current ?? undefined);
  const draft = anonymousDraft();
  set("session", DRAFT_KEY, draft ? JSON.stringify(draft) : null);
  set("session", ATTEMPT_KEY, null);
}

/** Written on sign-out; other tabs hear it and drop what they're showing. */
export const SIGNED_OUT_SIGNAL = "cosmos-quote-signed-out";

/**
 * On sign-out: forget answers in this browser that another person could see
 * next. Drafts go (anonymous and this tab's owned ones), every attempt keeps
 * only its marker, and other open tabs are told to do the same.
 */
export function forgetOnSignOut() {
  anonymousWork.clear();
  settleQuoteStorage(null);
  set("local", SIGNED_OUT_SIGNAL, String(Date.now()));
}
