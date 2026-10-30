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
 * made, nothing the client entered. A marker means the outcome is unknown and
 * the answers needed for an identical retry are gone, so nothing more is sent
 * for that account here. Age doesn't change that, because the Studio may hold
 * the request however old the marker is. It stays until the client confirms a
 * separate request (archiveAttempt).
 */
export type Intake = 1 | 2;

export const OWNED_DRAFT_PREFIX = "cosmos-quote-draft:";
export const OWNED_ATTEMPT_PREFIX = "cosmos-quote-attempt:";
const ARCHIVE_INFIX = "-archive-";
/** An unconfirmed attempt's answers are kept this long for an identical retry. */
export const OWNED_ATTEMPT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** A set-aside marker, already decided by the client, is kept this long. */
export const ARCHIVED_MARKER_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * An attempt whose outcome is unknown: its ID (null if the record was too
 * damaged to hold one), never its answers.
 */
export type UnresolvedAttempt = {
  submission_id: string | null;
  savedAt: number;
};

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
) {
  return JSON.stringify({ version: 1, owner, intake, savedAt: now, attempt });
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
  submission_id: string | null,
  owner: string,
  intake: Intake,
  savedAt = Date.now(),
) {
  return JSON.stringify({ version: 2, owner, intake, savedAt, submission_id });
}

export function readUnresolved(
  raw: string | null,
  owner: string,
): UnresolvedAttempt | null {
  const value = parseRecord(raw);
  if (
    value?.version !== 2 ||
    value.owner !== owner ||
    typeof value.savedAt !== "number" ||
    (value.submission_id !== null &&
      !z.uuid().safeParse(value.submission_id).success)
  )
    return null;
  return {
    submission_id: value.submission_id as string | null,
    savedAt: value.savedAt,
  };
}

/** A stored record's ID, from either shape, whatever else is wrong with it. */
function storedId(value: StoredRecord | null) {
  const attempt = value?.attempt as StoredRecord | undefined;
  const id = value?.submission_id ?? attempt?.submission_id;
  return z.uuid().safeParse(id).success ? (id as string) : null;
}

/**
 * The marker that replaces a record, whatever state it's in. A record too
 * damaged to give an ID still leaves one, so an uncertain send is never
 * forgotten; its contents are dropped, since they could be anything.
 */
function retired(value: StoredRecord | null, owner: string, now: number) {
  const savedAt =
    typeof value?.savedAt === "number" && value.savedAt <= now
      ? value.savedAt
      : now;
  return writeUnresolved(
    storedId(value),
    owner,
    value?.intake === 1 ? 1 : 2,
    savedAt,
  );
}

export type QuoteSlots = {
  owner: string | null;
  loadDraft(): QuoteDraft | null;
  saveDraft(draft: QuoteDraft | null): boolean;
  /**
   * `attempt`: answers to retry exactly. `unresolved`: only the marker is
   * left, so nothing can be sent. `unreadable`: a signed-out tab's attempt
   * can't be trusted.
   */
  loadAttempt(): {
    attempt: QuoteAttempt | null;
    unresolved: UnresolvedAttempt | null;
    unreadable: boolean;
  };
  saveAttempt(attempt: QuoteAttempt): boolean;
  clearAttempt(): void;
  /** The client's confirmed decision: set this aside so a new one can start. */
  archiveAttempt(submission_id: string | null): boolean;
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
      const attempt = readOwnedAttempt(raw, owner, intake);
      if (attempt) return { ...noAttempt, attempt };
      // Expired, damaged, or made for another intake version: never sent
      // here, and the fact of it mustn't be overwritten by a new attempt.
      const unresolved = readUnresolved(raw, owner);
      set("session", draftKey, null);
      if (unresolved) return { ...noAttempt, unresolved };
      const marker = retired(parseRecord(raw), owner, Date.now());
      set("local", attemptKey, marker);
      return { ...noAttempt, unresolved: readUnresolved(marker, owner) };
    },
    saveAttempt: (attempt) =>
      set("local", attemptKey, writeOwnedAttempt(attempt, owner, intake)),
    clearAttempt: () => void set("local", attemptKey, null),
    archiveAttempt: (id) =>
      set(
        "local",
        `${attemptKey}${ARCHIVE_INFIX}${id ?? `unknown-${Date.now()}`}`,
        writeUnresolved(id, owner, intake),
      ) && set("local", attemptKey, null),
    retireAttempt: () => {
      const raw = get("local", attemptKey);
      if (raw)
        set("local", attemptKey, retired(parseRecord(raw), owner, Date.now()));
    },
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
 * archived markers lapse, and a handoff in the old full format goes. A live
 * marker never lapses. With a known session: answers belonging to anyone else
 * become markers, other accounts' tab drafts go, and a signed-out tab keeps
 * only allowlisted choices.
 */
export function settleQuoteStorage(current?: string | null, now = Date.now()) {
  quoteHandoff.load();
  for (const key of keys("local")) {
    if (!key.startsWith(OWNED_ATTEMPT_PREFIX)) continue;
    const [owner, archived] = key
      .slice(OWNED_ATTEMPT_PREFIX.length)
      .split(ARCHIVE_INFIX);
    const value = parseRecord(get("local", key));
    if (archived) {
      const lapsed =
        typeof value?.savedAt !== "number" ||
        now - value.savedAt > ARCHIVED_MARKER_TTL_MS;
      if (lapsed || !storedId(value)) set("local", key, null);
      else if (value.version !== 2)
        set("local", key, retired(value, owner, now));
      continue;
    }
    // A marker's answers are gone, so this tab's copy of them goes too.
    if (value?.version === 2) {
      set("session", `${OWNED_DRAFT_PREFIX}${owner}`, null);
      continue;
    }
    const fresh =
      typeof value?.savedAt === "number" &&
      value.savedAt <= now &&
      now - value.savedAt <= OWNED_ATTEMPT_TTL_MS;
    if (fresh && (current === undefined || current === owner)) continue;
    set("local", key, retired(value, owner, now));
    set("session", `${OWNED_DRAFT_PREFIX}${owner}`, null);
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
