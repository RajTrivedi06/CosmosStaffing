import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  OWNED_ATTEMPT_TTL_MS,
  anonymousWork,
  forgetOnSignOut,
  quoteSlots,
  readOwnedAttempt,
  writeOwnedAttempt,
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

const ALICE = "a".repeat(32);
const BOB = "b".repeat(32);
const attempt = {
  submission_id: "00000000-0000-4000-8000-000000000301",
  answers: homeQuote,
} as QuoteAttempt;

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
    expect(quoteSlots(ALICE, 2).loadAttempt()).toEqual({
      attempt,
      unreadable: false,
    });
    // Bob, in the same browser, sees nothing.
    expect(quoteSlots(BOB, 2).loadAttempt()).toEqual({
      attempt: null,
      unreadable: false,
    });
    // Nor does the signed-out screen.
    expect(quoteSlots(null, 1).loadAttempt().attempt).toBeNull();
    // A different intake version for Alice is ignored, not an error.
    expect(quoteSlots(ALICE, 1).loadAttempt()).toEqual({
      attempt: null,
      unreadable: false,
    });
  });

  it("keeps the anonymous attempt where it was", () => {
    session.setItem(ATTEMPT_KEY, JSON.stringify(attempt));
    expect(quoteSlots(null, 1).loadAttempt().attempt).toEqual(attempt);
    expect(quoteSlots(ALICE, 2).loadAttempt().attempt).toBeNull();
  });
});

describe("answers from before sign-in", () => {
  it("are found for an explicit offer, never loaded as an account's draft", () => {
    session.setItem(
      DRAFT_KEY,
      JSON.stringify({ answers: homeQuote, step: "review" }),
    );
    expect(quoteSlots(ALICE, 2).loadDraft()).toBeNull();
    expect(anonymousWork.load()?.answers.email).toBe(homeQuote.email);
    anonymousWork.clear();
    expect(anonymousWork.load()).toBeNull();
  });

  it("sign-out forgets drafts but keeps an unconfirmed attempt for its owner", () => {
    local.setItem(
      HANDOFF_KEY,
      writeQuoteHandoff({ answers: homeQuote, step: "review" }),
    );
    session.setItem(
      DRAFT_KEY,
      JSON.stringify({ answers: homeQuote, step: "review" }),
    );
    quoteSlots(ALICE, 2).saveDraft({ answers: homeQuote, step: "review" });
    quoteSlots(ALICE, 2).saveAttempt(attempt);
    forgetOnSignOut();
    expect(local.getItem(HANDOFF_KEY)).toBeNull();
    expect(session.data.size).toBe(0);
    expect(quoteSlots(ALICE, 2).loadAttempt().attempt).toEqual(attempt);
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
