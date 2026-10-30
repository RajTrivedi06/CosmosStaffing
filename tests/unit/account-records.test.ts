import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ARCHIVED_MARKER_TTL_MS,
  OWNED_ATTEMPT_PREFIX,
  OWNED_ATTEMPT_TTL_MS,
  anonymousWork,
  forgetOnSignOut,
  quoteSlots,
  readOwnedAttempt,
  readUnresolved,
  settleQuoteStorage,
  writeOwnedAttempt,
  writeUnresolved,
} from "@/lib/quote-store";
import { ATTEMPT_KEY, type QuoteAttempt } from "@/lib/quote-attempt";
import { DRAFT_KEY } from "@/lib/quote-draft";
import { HANDOFF_KEY, writeQuoteHandoff } from "@/lib/quote-handoff";
import { requestFacts, requestGroup } from "@/lib/account/labels";
import { openQuote, requestItems } from "@/lib/account/records";
import type {
  RequestDetail,
  RequestSummary,
} from "@/lib/customer-api-contract";
import { homeQuote } from "./fixtures";

/** Nothing a client entered: these must never outlive their session. */
const SENSITIVE = [
  homeQuote.name,
  homeQuote.email,
  homeQuote.phone,
  homeQuote.notes,
  '"zip"',
];
const ALICE = "a".repeat(32);
const BOB = "b".repeat(32);
const attempt = {
  submission_id: "00000000-0000-4000-8000-000000000301",
  answers: homeQuote,
} as QuoteAttempt;

const none = { attempt: null, unresolved: null, unreadable: false };

class MemoryStorage {
  data = new Map<string, string>();
  getItem = (k: string) => this.data.get(k) ?? null;
  setItem = (k: string, v: string) => void this.data.set(k, v);
  removeItem = (k: string) => void this.data.delete(k);
  key = (i: number) => [...this.data.keys()][i] ?? null;
  get length() {
    return this.data.size;
  }
}
let local: MemoryStorage;
let session: MemoryStorage;
beforeEach(() => {
  local = new MemoryStorage();
  session = new MemoryStorage();
  // Object.keys(sessionStorage) lists stored keys in browsers.
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal(
    "sessionStorage",
    new Proxy(session, {
      ownKeys: () => [...session.data.keys()],
      getOwnPropertyDescriptor: () => ({
        enumerable: true,
        configurable: true,
      }),
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("account-bound send attempts", () => {
  const now = 1_800_000_000_000;

  it("reads back only for the same account and intake version", () => {
    const raw = writeOwnedAttempt(attempt, ALICE, 2, now);
    expect(readOwnedAttempt(raw, ALICE, 2, now)).toEqual(attempt);
    expect(readOwnedAttempt(raw, BOB, 2, now)).toBeNull();
    // A v1 attempt is never sent as v2, and the other way round.
    expect(readOwnedAttempt(raw, ALICE, 1, now)).toBeNull();
  });

  it("expires, and rejects future or tampered records", () => {
    const raw = writeOwnedAttempt(attempt, ALICE, 2, now);
    expect(
      readOwnedAttempt(raw, ALICE, 2, now + OWNED_ATTEMPT_TTL_MS + 1),
    ).toBeNull();
    expect(readOwnedAttempt(raw, ALICE, 2, now - 1)).toBeNull();
    const tampered = JSON.parse(raw);
    tampered.attempt.answers.customer_id = "forged";
    expect(
      readOwnedAttempt(JSON.stringify(tampered), ALICE, 2, now),
    ).toBeNull();
  });

  it("files each account's attempt separately, visible to all its tabs", () => {
    const alice = quoteSlots(ALICE, 2);
    expect(alice.saveAttempt(attempt)).toBe(true);
    // Shared storage: another tab of Alice's finds it.
    expect(quoteSlots(ALICE, 2).loadAttempt()).toEqual({ ...none, attempt });
    // Bob, in the same browser, sees nothing.
    expect(quoteSlots(BOB, 2).loadAttempt()).toEqual(none);
    // Nor does the signed-out screen.
    expect(quoteSlots(null, 1).loadAttempt().attempt).toBeNull();
  });

  it("never sends another intake version's attempt, or forgets it", () => {
    quoteSlots(ALICE, 2).saveAttempt(attempt);
    const seen = quoteSlots(ALICE, 1).loadAttempt();
    expect(seen.attempt).toBeNull();
    expect(seen.unresolved?.submission_id).toBe(attempt.submission_id);
  });

  it("keeps the anonymous attempt where it was while accounts are off", () => {
    session.setItem(ATTEMPT_KEY, JSON.stringify(attempt));
    expect(quoteSlots(null, 1).loadAttempt().attempt).toEqual(attempt);
    expect(quoteSlots(ALICE, 2).loadAttempt().attempt).toBeNull();
    // With accounts on, only a signed-in client has attempts.
    expect(quoteSlots(null, 1, true).loadAttempt().attempt).toBeNull();
  });
});

describe("attempts whose outcome is unknown", () => {
  const now = 1_800_000_000_000;
  const key = `${OWNED_ATTEMPT_PREFIX}${ALICE}`;
  const stored = () => [...local.data.values(), ...session.data.values()];
  const clean = () => {
    for (const raw of stored())
      for (const value of SENSITIVE) expect(raw).not.toContain(value);
  };
  const marker = { submission_id: attempt.submission_id };

  it("keeps only the ID and when, for its owner", () => {
    const raw = writeUnresolved(attempt.submission_id, ALICE, 2, now);
    expect(JSON.parse(raw)).toEqual({
      version: 2,
      owner: ALICE,
      intake: 2,
      savedAt: now,
      submission_id: attempt.submission_id,
    });
    expect(readUnresolved(raw, ALICE)).toEqual({ ...marker, savedAt: now });
    expect(readUnresolved(raw, BOB)).toBeNull();
  });

  it("sign-out leaves the marker and none of the answers", () => {
    quoteSlots(ALICE, 2).saveAttempt(attempt);
    forgetOnSignOut();
    clean();
    const { attempt: payload, unresolved } = quoteSlots(ALICE, 2).loadAttempt();
    expect(payload).toBeNull();
    expect(unresolved).toMatchObject(marker);
    // Bob, on the same browser, sees nothing of it.
    expect(quoteSlots(BOB, 2).loadAttempt()).toEqual(none);
  });

  it("expiry leaves the marker and none of the answers", () => {
    local.setItem(key, writeOwnedAttempt(attempt, ALICE, 2, now));
    settleQuoteStorage(undefined, now + OWNED_ATTEMPT_TTL_MS + 1);
    clean();
    expect(local.getItem(key)).toBe(
      writeUnresolved(attempt.submission_id, ALICE, 2, now),
    );
  });

  it("an expired record found by the quote screen is retired too", () => {
    local.setItem(
      key,
      writeOwnedAttempt(
        attempt,
        ALICE,
        2,
        Date.now() - OWNED_ATTEMPT_TTL_MS - 1,
      ),
    );
    expect(quoteSlots(ALICE, 2).loadAttempt().unresolved).toMatchObject(marker);
    clean();
  });

  it("keeps a live attempt for the client signed in here, and only them", () => {
    quoteSlots(ALICE, 2).saveAttempt(attempt);
    settleQuoteStorage(ALICE);
    expect(quoteSlots(ALICE, 2).loadAttempt().attempt).toEqual(attempt);
    // Unknown session (a marketing page): nothing changes either.
    settleQuoteStorage(undefined);
    expect(quoteSlots(ALICE, 2).loadAttempt().attempt).toEqual(attempt);
    // Her session ended, or Bob signed in: her answers go, wherever noticed.
    settleQuoteStorage(BOB);
    clean();
    expect(quoteSlots(ALICE, 2).loadAttempt().unresolved).toMatchObject(marker);
  });

  it("a session that ended does the same as signing out", () => {
    quoteSlots(ALICE, 2).saveAttempt(attempt);
    quoteSlots(ALICE, 2).saveDraft({ answers: homeQuote, step: "review" });
    settleQuoteStorage(null);
    clean();
    expect(quoteSlots(ALICE, 2).loadDraft()).toBeNull();
  });

  it("archives hold a marker only, including older ones", () => {
    quoteSlots(ALICE, 2).saveAttempt(attempt);
    expect(quoteSlots(ALICE, 2).archiveAttempt(attempt.submission_id)).toBe(
      true,
    );
    clean();
    expect(quoteSlots(ALICE, 2).loadAttempt()).toEqual(none);
    expect(stored().join()).toContain(attempt.submission_id);

    const older = `${key}-archive-00000000-0000-4000-8000-000000000302`;
    local.setItem(
      older,
      writeOwnedAttempt(
        { ...attempt, submission_id: older.slice(-36) },
        ALICE,
        2,
      ),
    );
    session.setItem(`${ATTEMPT_KEY}-archive-x`, JSON.stringify(attempt));
    settleQuoteStorage(undefined);
    clean();
    expect(JSON.parse(local.getItem(older)!).version).toBe(2);
    expect(session.getItem(`${ATTEMPT_KEY}-archive-x`)).toContain(
      attempt.submission_id,
    );
  });

  it("anonymous archives hold a marker only", () => {
    quoteSlots(null, 1).saveAttempt(attempt);
    quoteSlots(null, 1).archiveAttempt(attempt.submission_id);
    clean();
    expect(quoteSlots(null, 1).loadAttempt().attempt).toBeNull();
  });

  it("age alone never removes a marker or permits a new ID", () => {
    local.setItem(key, writeUnresolved(attempt.submission_id, ALICE, 2, now));
    // Past the old 30-day limit, then much further, from any page or the quote.
    for (const later of [
      now + ARCHIVED_MARKER_TTL_MS + 1,
      now + 10 * 365 * 24 * 60 * 60 * 1000,
    ]) {
      settleQuoteStorage(undefined, later);
      settleQuoteStorage(ALICE, later);
      settleQuoteStorage(null, later);
      // Every read, not just the first: a reload sees the same thing.
      for (let reload = 0; reload < 2; reload++) {
        const { attempt: payload, unresolved } = quoteSlots(
          ALICE,
          2,
        ).loadAttempt();
        expect(payload).toBeNull();
        expect(unresolved).toMatchObject(marker);
      }
    }
  });

  it("only a confirmed separate request sets a marker aside", () => {
    local.setItem(key, writeUnresolved(attempt.submission_id, ALICE, 2, now));
    expect(quoteSlots(ALICE, 2).archiveAttempt(attempt.submission_id)).toBe(
      true,
    );
    expect(quoteSlots(ALICE, 2).loadAttempt()).toEqual(none);
    // The decided record may lapse; nothing else depends on it.
    settleQuoteStorage(undefined);
    expect(stored().join()).toContain(attempt.submission_id);
    settleQuoteStorage(undefined, Date.now() + ARCHIVED_MARKER_TTL_MS + 1);
    expect(local.data.size).toBe(0);
  });

  it("a retried send can't overwrite a marker from another tab", () => {
    const tab = quoteSlots(ALICE, 2);
    expect(tab.loadAttempt()).toEqual(none);
    local.setItem(key, writeUnresolved(attempt.submission_id, ALICE, 2, now));
    // What the send path checks immediately before minting an ID.
    expect(tab.loadAttempt().unresolved).toMatchObject(marker);
  });

  it("a damaged record keeps its ID if it can, and is never forgotten", () => {
    local.setItem(
      key,
      JSON.stringify({
        version: 1,
        owner: ALICE,
        intake: 2,
        savedAt: "soon",
        attempt,
      }),
    );
    expect(quoteSlots(ALICE, 2).loadAttempt().unresolved).toMatchObject(marker);
    clean();

    local.setItem(key, `not json ${homeQuote.email}`);
    for (let reload = 0; reload < 2; reload++) {
      const { attempt: payload, unresolved } = quoteSlots(
        ALICE,
        2,
      ).loadAttempt();
      expect(payload).toBeNull();
      expect(unresolved?.submission_id).toBeNull();
    }
    clean();
    // The same from a page that doesn't know who is signed in.
    local.setItem(key, `not json ${homeQuote.email}`);
    settleQuoteStorage(null);
    clean();
    expect(quoteSlots(ALICE, 2).loadAttempt().unresolved).toBeTruthy();
    expect(quoteSlots(ALICE, 2).archiveAttempt(null)).toBe(true);
    expect(quoteSlots(ALICE, 2).loadAttempt()).toEqual(none);
  });
});

describe("answers from before sign-in", () => {
  it("are found for an explicit offer, as choices only", () => {
    session.setItem(
      DRAFT_KEY,
      JSON.stringify({ answers: homeQuote, step: "review" }),
    );
    expect(quoteSlots(ALICE, 2).loadDraft()).toBeNull();
    const offered = anonymousWork.load();
    expect(offered?.answers.service).toBe(homeQuote.service);
    expect(JSON.stringify(offered)).not.toContain(homeQuote.email);
    anonymousWork.clear();
    expect(anonymousWork.load()).toBeNull();
  });

  it("a signed-out visitor's draft stores choices only when accounts are on", () => {
    const slots = quoteSlots(null, 2, true);
    slots.saveDraft({ answers: homeQuote, step: "condition" });
    const raw = session.getItem(DRAFT_KEY)!;
    for (const value of SENSITIVE) expect(raw).not.toContain(value);
    expect(slots.loadDraft()?.step).toBe("condition");
    // Accounts off: the tab's draft is the whole quote, as it always was.
    quoteSlots(null, 1).saveDraft({ answers: homeQuote, step: "contact" });
    expect(session.getItem(DRAFT_KEY)).toContain(homeQuote.email);
  });

  it("purges sensitive anonymous data stored by an earlier version", () => {
    local.setItem(
      HANDOFF_KEY,
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        draft: { answers: homeQuote, step: "review" },
      }),
    );
    session.setItem(
      DRAFT_KEY,
      JSON.stringify({ answers: homeQuote, step: "review" }),
    );
    session.setItem(ATTEMPT_KEY, JSON.stringify(attempt));
    // Any page removes the old handoff, without knowing who is signed in.
    settleQuoteStorage(undefined);
    expect(local.getItem(HANDOFF_KEY)).toBeNull();
    // Once the session is known, the tab keeps choices only.
    settleQuoteStorage(null);
    for (const raw of session.data.values())
      for (const value of SENSITIVE) expect(raw).not.toContain(value);
    expect(session.getItem(ATTEMPT_KEY)).toBeNull();
    expect(anonymousWork.load()?.answers.service).toBe(homeQuote.service);
  });

  it("sign-out forgets drafts and keeps a marker for the owner", () => {
    local.setItem(HANDOFF_KEY, writeQuoteHandoff(homeQuote));
    session.setItem(
      DRAFT_KEY,
      JSON.stringify({ answers: homeQuote, step: "review" }),
    );
    quoteSlots(ALICE, 2).saveDraft({ answers: homeQuote, step: "review" });
    quoteSlots(ALICE, 2).saveAttempt(attempt);
    forgetOnSignOut();
    expect(local.getItem(HANDOFF_KEY)).toBeNull();
    expect(session.data.size).toBe(0);
    expect(quoteSlots(ALICE, 2).loadAttempt().unresolved?.submission_id).toBe(
      attempt.submission_id,
    );
  });
});

const summary = (patch: Partial<RequestSummary> = {}): RequestSummary => ({
  request_id: "00000000-0000-4000-8000-000000000401",
  job_number: 1001,
  submitted_at: "2026-10-30T14:00:00+00:00",
  sales_status: "new",
  service_status: "unassigned",
  scheduled_start_at: null,
  scheduled_end_at: null,
  quote_accepted: false,
  payment_status: "unpaid",
  ...patch,
});

describe("status wording", () => {
  it("never calls an accepted quote a booking", () => {
    const facts = requestFacts(
      summary({ sales_status: "quoted", quote_accepted: true }),
    );
    expect(facts).toContain("Quote accepted");
    expect(facts).toContain("Not scheduled yet");
    expect(facts.join(" ")).not.toMatch(/book/i);
  });

  it("shows a booking only when the Studio confirmed one", () => {
    const facts = requestFacts(
      summary({
        sales_status: "won",
        quote_accepted: true,
        service_status: "confirmed",
        scheduled_start_at: "2026-11-03T15:00:00+00:00",
      }),
    );
    expect(facts[0]).toBe("Accepted");
    expect(facts[1]).toMatch(/^Booked for .*Nov 3, 2026.*C[SD]T$/);
    expect(requestGroup(summary({ service_status: "confirmed" }))).toBe(
      "upcoming",
    );
  });

  it("keeps payment separate, and says nothing for unknown values", () => {
    expect(requestFacts(summary({ payment_status: "paid" }))).toEqual([
      "Request received",
      "Paid",
    ]);
    expect(
      requestFacts(
        summary({
          sales_status: "something_new",
          service_status: "something_else",
          payment_status: "unpaid",
        }),
      ),
    ).toEqual([]);
  });
});

describe("quotes and payments on a request", () => {
  const now = Date.parse("2026-11-01T00:00:00Z");
  const quote = (patch: object = {}) => ({
    quote_id: crypto.randomUUID(),
    token: crypto.randomUUID(),
    version: 1,
    client_price_cents: 18000,
    discount_cents: 0,
    tax_cents: 0,
    tip_cents: 0,
    total_cents: 18000,
    sent_at: "2026-10-30T15:00:00+00:00",
    accepted_at: null,
    accepted_by_name: null,
    changes_requested_at: null,
    superseded: false,
    link_expires_at: "2026-11-10T00:00:00+00:00",
    ...patch,
  });
  const detail = (patch: Partial<RequestDetail>): RequestDetail => ({
    ...summary({ sales_status: "quoted" }),
    answers: null,
    quotes: [],
    quotes_has_more: false,
    payment_requests: [],
    payment_requests_has_more: false,
    ...patch,
  });

  it("offers only the current, unaccepted, unexpired quote", () => {
    const current = quote({ version: 2 });
    expect(
      openQuote(
        detail({
          quotes: [
            quote({ version: 3, superseded: true }),
            current,
            quote({ version: 1, link_expires_at: "2026-10-31T00:00:00+00:00" }),
          ],
        }),
        now,
      )?.quote_id,
    ).toBe(current.quote_id);
    expect(
      openQuote(
        detail({
          quotes: [quote({ accepted_at: "2026-10-31T00:00:00+00:00" })],
        }),
        now,
      ),
    ).toBeNull();
  });

  it("links to the Studio's own pages, payment only while due", () => {
    const open = quote();
    const { quotes, payments } = requestItems(
      detail({
        quotes: [open, quote({ superseded: true })],
        payment_requests: [
          {
            payment_request_id: crypto.randomUUID(),
            token: "00000000-0000-4000-8000-0000000000c1",
            amount_cents: 18000,
            description: "Home cleaning",
            status: "open",
            created_at: "2026-10-31T00:00:00+00:00",
            expires_at: "2026-11-05T00:00:00+00:00",
            paid_at: null,
          },
          {
            payment_request_id: crypto.randomUUID(),
            token: "00000000-0000-4000-8000-0000000000c2",
            amount_cents: 5000,
            description: "Deposit",
            status: "paid",
            created_at: "2026-10-20T00:00:00+00:00",
            expires_at: "2026-10-25T00:00:00+00:00",
            paid_at: "2026-10-21T00:00:00+00:00",
          },
        ],
      }),
      now,
    );
    expect(quotes[0].href).toBe(`/q/${open.token}`);
    expect(quotes[1].href).toBeUndefined();
    expect(quotes[1].facts).toContain("Replaced by a newer quote");
    expect(payments[0].href).toBe("/pay/00000000-0000-4000-8000-0000000000c1");
    expect(payments[1].href).toBeUndefined();
    expect(payments[1].facts[0]).toBe("Paid");
  });
});
