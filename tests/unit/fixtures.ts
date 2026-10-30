import { EMPTY_ANSWERS, type QuoteAnswers } from "@/lib/quote";

/** A complete regular home-cleaning request. */
export const homeQuote: QuoteAnswers = {
  ...EMPTY_ANSWERS,
  service: "regular",
  property: "house",
  bedrooms: "3",
  bathrooms: "2",
  frequency: "biweekly",
  condition: "kept",
  zip: "78701",
  timing: "two-weeks",
  extras: ["pets"],
  notes: "Gate code at the side door.",
  name: "Alex Rivera",
  email: "alex@example.com",
  phone: "512-555-0100",
};

/** A complete workplace request. */
export const officeQuote: QuoteAnswers = {
  ...EMPTY_ANSWERS,
  service: "office",
  property: "office",
  area: "1500-4000",
  frequency: "several",
  condition: "some",
  zip: "10001",
  timing: "date",
  date: "2026-12-01",
  extras: ["after-hours"],
  notes: "",
  name: "Sam Lee",
  email: "sam@example.com",
  phone: "555-0100",
};
