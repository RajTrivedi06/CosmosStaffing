import { describe, expect, it } from "vitest";
import { homeQuote, officeQuote } from "./fixtures";
import { localCalendarDate, preferredDateError } from "@/lib/quote-date";
import { readQuoteDraft, updateQuoteAnswers } from "@/lib/quote-draft";
import { quoteSchema } from "@/lib/quote";

describe("preferred dates", () => {
  it.each([
    "2026-02-30",
    "2025-02-29",
    "2026-13-01",
    "2026-00-15",
    "0000-01-01",
    "2026-01-00",
    "10/29/2026",
  ])("rejects impossible date %s", (date) => {
    expect(preferredDateError(date)).toBe("Choose a valid calendar date.");
    expect(quoteSchema.safeParse({ ...officeQuote, date }).success).toBe(false);
  });
  it("accepts leap days and enforces an explicit local-day minimum in the UI", () => {
    expect(preferredDateError("2028-02-29")).toBeNull();
    expect(preferredDateError("2026-10-28", "2026-10-29")).toBe(
      "Choose today or a later date.",
    );
    expect(preferredDateError("2026-10-29", "2026-10-29")).toBeNull();
  });
  it("rolls calendar days over month/year boundaries without using UTC dates", () => {
    const evening = new Date(2026, 11, 31, 23, 59);
    expect(localCalendarDate(0, evening)).toBe("2026-12-31");
    expect(localCalendarDate(1, evening)).toBe("2027-01-01");
    expect(localCalendarDate(7, evening)).toBe("2027-01-07");
  });
});

describe("draft recovery", () => {
  it.each([null, "{bad", "null", "[]", '{"answers":null}'])(
    "handles invalid saved data: %s",
    (raw) => {
      expect(readQuoteDraft(raw)).toBeNull();
    },
  );
  it("restores an existing complete draft unchanged", () => {
    expect(
      readQuoteDraft(JSON.stringify({ answers: homeQuote, step: "review" })),
    ).toEqual({ answers: homeQuote, step: "review" });
  });
  it("recovers valid contact fields from partial or damaged data", () => {
    const restored = readQuoteDraft(
      JSON.stringify({
        answers: {
          name: "Alex",
          email: "alex@example.com",
          extras: "broken",
          notes: 42,
        },
        step: "missing-step",
      }),
    );
    expect(restored).toMatchObject({
      step: "service",
      answers: {
        name: "Alex",
        email: "alex@example.com",
        notes: "",
        extras: [],
      },
    });
  });
  it("resumes at an applicable question if the saved step no longer exists", () => {
    const restored = readQuoteDraft(
      JSON.stringify({
        answers: { ...homeQuote, service: "deep", zip: "" },
        step: "frequency",
      }),
    );
    expect(restored?.step).toBe("location");
  });
  it("keeps contact details while clearing impossible choices after a branch change", () => {
    const changed = updateQuoteAnswers(homeQuote, { service: "office" });
    expect(changed).toMatchObject({
      service: "office",
      name: homeQuote.name,
      email: homeQuote.email,
      notes: homeQuote.notes,
      zip: homeQuote.zip,
      extras: [],
    });
    expect(changed.property).toBeUndefined();
    expect(changed.bedrooms).toBe(homeQuote.bedrooms);
  });
  it("repairs stale hidden extras so a restored workplace draft can continue", () => {
    const restored = readQuoteDraft(
      JSON.stringify({
        answers: { ...officeQuote, extras: ["pets", "after-hours"] },
        step: "details",
      }),
    );
    expect(restored?.answers.extras).toEqual(["after-hours"]);
    expect(quoteSchema.safeParse(restored?.answers).success).toBe(true);
  });
});
