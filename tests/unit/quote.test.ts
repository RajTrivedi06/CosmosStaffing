import { describe, expect, it } from "vitest";
import {
  EMPTY_ANSWERS,
  answersFromParams,
  answersToParams,
  firstOpenStep,
  isTexasZip,
  quoteSchema,
  stepError,
  stepsFor,
  summarize,
} from "@/lib/quote";
import { homeQuote, officeQuote } from "./fixtures";

describe("stepsFor", () => {
  it("asks how often only for recurring services", () => {
    expect(stepsFor({ ...EMPTY_ANSWERS, service: "regular" })).toContain(
      "frequency",
    );
    expect(stepsFor({ ...EMPTY_ANSWERS, service: "office" })).toContain(
      "frequency",
    );
    for (const service of ["deep", "move", "other"] as const) {
      expect(stepsFor({ ...EMPTY_ANSWERS, service })).not.toContain(
        "frequency",
      );
    }
  });

  it("always ends with contact details, then the review", () => {
    expect(stepsFor(homeQuote).slice(-2)).toEqual(["contact", "review"]);
  });
});

describe("stepError", () => {
  it("accepts every step of a complete request", () => {
    for (const quote of [homeQuote, officeQuote]) {
      for (const step of stepsFor(quote)) {
        expect(stepError(step, quote), step).toBeNull();
      }
    }
  });

  it("rejects a property that does not fit the service", () => {
    expect(stepError("property", { ...officeQuote, property: "house" })).toBe(
      "Choose the type of property.",
    );
  });

  it("asks homes for rooms and workplaces for floor area", () => {
    expect(stepError("size", { ...homeQuote, bathrooms: undefined })).toBe(
      "Choose the number of bathrooms.",
    );
    expect(stepError("size", { ...officeQuote, area: undefined })).toBe(
      "Choose the approximate floor area.",
    );
  });

  it("needs a five-digit ZIP code", () => {
    expect(stepError("location", { ...homeQuote, zip: "7870" })).toBe(
      "Enter a 5-digit ZIP code.",
    );
  });

  it("needs a date when a specific date is chosen", () => {
    expect(stepError("timing", { ...officeQuote, date: undefined })).toBe(
      "Choose a date.",
    );
  });

  it("checks contact details", () => {
    expect(stepError("contact", { ...homeQuote, name: "  " })).toBe(
      "Please enter your name.",
    );
    expect(stepError("contact", { ...homeQuote, email: "alex@" })).toBe(
      "Enter a valid email address.",
    );
  });

  it("only allows listed extras", () => {
    expect(stepError("details", { ...homeQuote, extras: ["pool"] })).toBe(
      "Choose from the listed options.",
    );
  });
});

describe("isTexasZip", () => {
  it.each([
    ["78701", true], // Austin
    ["77002", true], // Houston
    ["78205", true], // San Antonio
    ["75201", true], // Dallas
    ["73301", true], // Austin IRS
    ["88510", true], // El Paso PO boxes
    ["10001", false],
    ["90210", false],
    ["7870", false],
  ])("%s → %s", (zip, expected) => {
    expect(isTexasZip(zip)).toBe(expected);
  });
});

describe("summarize", () => {
  it("describes a home request in words", () => {
    const rows = Object.fromEntries(
      summarize(homeQuote).map((r) => [r.label, r.value]),
    );
    expect(rows.Service).toBe("Regular home cleaning");
    expect(rows.Size).toBe("3 bedrooms, 2 bathrooms");
    expect(rows["How often"]).toBe("Every two weeks");
    expect(rows.Details).toBe("Pets at home. Gate code at the side door.");
  });

  it("leaves out how often for one-off services", () => {
    const labels = summarize({ ...homeQuote, service: "deep" }).map(
      (r) => r.label,
    );
    expect(labels).not.toContain("How often");
  });
});

describe("quoteSchema", () => {
  it("accepts complete requests", () => {
    expect(quoteSchema.safeParse(homeQuote).success).toBe(true);
    expect(quoteSchema.safeParse(officeQuote).success).toBe(true);
  });

  it("rejects an unknown service", () => {
    expect(
      quoteSchema.safeParse({ ...homeQuote, service: "windows" }).success,
    ).toBe(false);
  });

  it("runs every applicable step check", () => {
    const result = quoteSchema.safeParse({ ...homeQuote, frequency: "daily" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path[0])).toEqual(["frequency"]);
  });

  it("caps field lengths", () => {
    expect(
      quoteSchema.safeParse({ ...homeQuote, notes: "x".repeat(1001) }).success,
    ).toBe(false);
  });
});

describe("shareable links", () => {
  it("round-trips the choices", () => {
    const params = answersToParams(officeQuote);
    expect(answersFromParams(params)).toEqual({
      service: "office",
      property: "office",
      area: "1500-4000",
      frequency: "several",
      condition: "some",
      timing: "date",
      extras: ["after-hours"],
    });
  });

  it("never puts personal details in the link", () => {
    const query = answersToParams(officeQuote).toString();
    for (const secret of ["10001", "2026-12-01", "Sam", "sam%40", "555"]) {
      expect(query).not.toContain(secret);
    }
  });

  it("drops values that are not options for the answers before them", () => {
    const params = new URLSearchParams(
      "service=office&property=house&frequency=several&extras=pets,after-hours,after-hours",
    );
    expect(answersFromParams(params)).toEqual({
      service: "office",
      frequency: "several",
      extras: ["after-hours"],
    });
  });

  it("ignores a link without a valid service", () => {
    expect(answersFromParams(new URLSearchParams("property=house"))).toEqual(
      {},
    );
    expect(answersFromParams(new URLSearchParams("service=pool"))).toEqual({});
  });

  it("opens on the first question still to answer", () => {
    expect(firstOpenStep({ ...EMPTY_ANSWERS, service: "office" })).toBe(
      "property",
    );
    expect(firstOpenStep({ ...homeQuote, zip: undefined })).toBe("location");
    expect(firstOpenStep(homeQuote)).toBe("review");
  });
});
