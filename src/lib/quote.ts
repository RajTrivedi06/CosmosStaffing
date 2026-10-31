import { z } from "zod";
import { preferredDateError } from "@/lib/quote-date";

/**
 * The guided quote: questions, answer options, which questions apply to which
 * answers, and validation. Shared by the quote screen and /api/quote, so the
 * server accepts exactly what the screen can produce.
 */

type Option = { value: string; label: string; hint?: string };

export const SERVICE_OPTIONS = [
  {
    value: "regular",
    label: "Regular home cleaning",
    hint: "Request weekly, every two weeks or monthly",
  },
  { value: "deep", label: "Deep clean", hint: "A more detailed reset" },
  {
    value: "move",
    label: "Move-in or move-out",
    hint: "For empty or nearly empty homes",
  },
  {
    value: "office",
    label: "Office or workplace",
    hint: "Offices, studios and retail spaces",
  },
  { value: "other", label: "Something else", hint: "Tell us what you need" },
] as const satisfies readonly Option[];

export type ServiceValue = (typeof SERVICE_OPTIONS)[number]["value"];
const SERVICE_VALUES = SERVICE_OPTIONS.map((o) => o.value) as [
  ServiceValue,
  ...ServiceValue[],
];

const HOME_PROPERTIES: Option[] = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment or condo" },
  { value: "townhouse", label: "Townhouse" },
];
const WORK_PROPERTIES: Option[] = [
  { value: "office", label: "Office" },
  { value: "retail", label: "Retail or showroom" },
  { value: "commercial", label: "Other commercial space" },
];

const BEDROOMS = ["Studio", "1", "2", "3", "4", "5+"];
const BATHROOMS = ["1", "2", "3", "4+"];
const AREAS: Option[] = [
  { value: "under-1500", label: "Under 1,500 sq ft" },
  { value: "1500-4000", label: "1,500 to 4,000 sq ft" },
  { value: "4000-10000", label: "4,000 to 10,000 sq ft" },
  { value: "over-10000", label: "Over 10,000 sq ft" },
  { value: "unsure", label: "Not sure" },
];

const HOME_FREQUENCIES: Option[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every two weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "unsure", label: "Not sure yet" },
];
const WORK_FREQUENCIES: Option[] = [
  { value: "several", label: "Several times a week" },
  ...HOME_FREQUENCIES,
];

const CONDITIONS: Option[] = [
  {
    value: "kept",
    label: "Well kept",
    hint: "Cleaned regularly, mostly upkeep",
  },
  {
    value: "some",
    label: "Needs some extra attention",
    hint: "A few areas have built up",
  },
  {
    value: "lots",
    label: "Needs a lot of attention",
    hint: "It has been a while",
  },
];
const OCCUPANCY: Option[] = [
  { value: "empty", label: "Empty" },
  { value: "partly", label: "Some furniture left" },
  { value: "furnished", label: "Fully furnished" },
];

const TIMINGS: Option[] = [
  { value: "asap", label: "As soon as possible" },
  { value: "two-weeks", label: "Within two weeks" },
  { value: "month", label: "Within a month" },
  { value: "flexible", label: "I'm flexible" },
  { value: "date", label: "On a specific date" },
];

const HOME_EXTRAS: Option[] = [
  { value: "pets", label: "Pets at home" },
  { value: "oven", label: "Inside the oven" },
  { value: "fridge", label: "Inside the refrigerator" },
  { value: "windows", label: "Interior windows" },
  { value: "sensitivities", label: "Allergies or product preferences" },
];
const WORK_EXTRAS: Option[] = [
  { value: "after-hours", label: "After-hours access" },
  { value: "kitchen", label: "Kitchen or break room" },
  { value: "restrooms", label: "Restrooms" },
  { value: "security", label: "Security or sign-in process" },
];

export type QuoteAnswers = {
  service?: ServiceValue;
  property?: string;
  bedrooms?: string;
  bathrooms?: string;
  area?: string;
  frequency?: string;
  condition?: string;
  zip?: string;
  timing?: string;
  date?: string;
  extras: string[];
  notes: string;
  name: string;
  email: string;
  phone: string;
};

export const EMPTY_ANSWERS: QuoteAnswers = {
  extras: [],
  notes: "",
  name: "",
  email: "",
  phone: "",
};

/** Home or workplace, from the service, or from the property for "other". */
export function spaceKind(a: Pick<QuoteAnswers, "service" | "property">) {
  if (a.service === "office") return "work";
  if (a.service === "other") {
    return WORK_PROPERTIES.some((p) => p.value === a.property)
      ? "work"
      : "home";
  }
  return "home";
}

export const propertyOptions = (a: QuoteAnswers) =>
  a.service === "office"
    ? WORK_PROPERTIES
    : a.service === "other"
      ? [...HOME_PROPERTIES, ...WORK_PROPERTIES]
      : HOME_PROPERTIES;

export const frequencyOptions = (a: QuoteAnswers) =>
  spaceKind(a) === "work" ? WORK_FREQUENCIES : HOME_FREQUENCIES;

export const conditionOptions = (a: QuoteAnswers) =>
  a.service === "move" ? OCCUPANCY : CONDITIONS;

export const extraOptions = (a: QuoteAnswers) =>
  spaceKind(a) === "work" ? WORK_EXTRAS : HOME_EXTRAS;

export const sizeOptions = {
  bedrooms: BEDROOMS,
  bathrooms: BATHROOMS,
  areas: AREAS,
};
export const timingOptions = TIMINGS;

export type StepId =
  | "service"
  | "property"
  | "size"
  | "frequency"
  | "condition"
  | "location"
  | "timing"
  | "details"
  | "contact"
  | "review";

/** The questions that apply, in order. Recurring services ask how often. */
export function stepsFor(a: QuoteAnswers): StepId[] {
  const recurring = a.service === "regular" || a.service === "office";
  return [
    "service",
    "property",
    "size",
    ...(recurring ? (["frequency"] as const) : []),
    "condition",
    "location",
    "timing",
    "details",
    "contact",
    "review",
  ];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIP_RE = /^\d{5}$/;

const has = (options: Option[] | string[], value?: string) =>
  !!value &&
  options.some((o) => (typeof o === "string" ? o : o.value) === value);

/**
 * The problem with one step's answers, or null when it is complete. The
 * screen uses this before moving on; the server runs every applicable step.
 */
export function stepError(step: StepId, a: QuoteAnswers): string | null {
  switch (step) {
    case "service":
      return has([...SERVICE_OPTIONS], a.service)
        ? null
        : "Choose the kind of cleaning you need.";
    case "property":
      return has(propertyOptions(a), a.property)
        ? null
        : "Choose the type of property.";
    case "size":
      if (spaceKind(a) === "work") {
        return has(AREAS, a.area) ? null : "Choose the approximate floor area.";
      }
      if (!has(BEDROOMS, a.bedrooms)) return "Choose the number of bedrooms.";
      return has(BATHROOMS, a.bathrooms)
        ? null
        : "Choose the number of bathrooms.";
    case "frequency":
      return has(frequencyOptions(a), a.frequency) ? null : "Choose how often.";
    case "condition":
      return has(conditionOptions(a), a.condition)
        ? null
        : a.service === "move"
          ? "Tell us whether the home will be empty."
          : "Choose the option closest to how it looks today.";
    case "location":
      return a.zip && ZIP_RE.test(a.zip) ? null : "Enter a 5-digit ZIP code.";
    case "timing":
      if (!has(TIMINGS, a.timing)) return "Choose when you'd like us to start.";
      return a.timing === "date" ? preferredDateError(a.date) : null;
    case "details":
      if (!a.extras.every((x) => has(extraOptions(a), x)))
        return "Choose from the listed options.";
      return a.notes.length > 1000
        ? "Keep notes under 1,000 characters."
        : null;
    case "contact":
      if (!a.name.trim()) return "Please enter your name.";
      if (a.name.length > 100) return "Keep your name under 100 characters.";
      if (!EMAIL_RE.test(a.email.trim())) return "Enter a valid email address.";
      if (!a.phone.trim()) return "Enter your phone number.";
      if (a.phone.length > 30) return "Enter a shorter phone number.";
      return null;
    case "review":
      return null;
  }
}

/** Texas ZIP codes start 733, 750 to 799, or 885. Used only to tailor copy. */
export function isTexasZip(zip?: string) {
  if (!zip || !ZIP_RE.test(zip)) return false;
  const p = Number(zip.slice(0, 3));
  return p === 733 || p === 885 || (p >= 750 && p <= 799);
}

const labelOf = (options: Option[], value?: string) =>
  options.find((o) => o.value === value)?.label ?? value ?? "";

/** Human-readable answers, for the review screen and the email. */
export function summarize(
  a: QuoteAnswers,
): { step: StepId; label: string; value: string }[] {
  const rows: { step: StepId; label: string; value: string }[] = [];
  const steps = stepsFor(a);
  rows.push({
    step: "service",
    label: "Service",
    value: labelOf([...SERVICE_OPTIONS], a.service),
  });
  rows.push({
    step: "property",
    label: "Property",
    value: labelOf(propertyOptions(a), a.property),
  });
  rows.push({
    step: "size",
    label: "Size",
    value:
      spaceKind(a) === "work"
        ? labelOf(AREAS, a.area)
        : `${a.bedrooms === "Studio" ? "Studio" : `${a.bedrooms} bedroom${a.bedrooms === "1" ? "" : "s"}`}, ${a.bathrooms} bathroom${a.bathrooms === "1" ? "" : "s"}`,
  });
  if (steps.includes("frequency")) {
    rows.push({
      step: "frequency",
      label: "How often",
      value: labelOf(frequencyOptions(a), a.frequency),
    });
  }
  rows.push({
    step: "condition",
    label: a.service === "move" ? "Furniture" : "Condition",
    value: labelOf(conditionOptions(a), a.condition),
  });
  rows.push({ step: "location", label: "ZIP code", value: a.zip ?? "" });
  rows.push({
    step: "timing",
    label: "Timing",
    value:
      a.timing === "date" && a.date
        ? formatDate(a.date)
        : labelOf(TIMINGS, a.timing),
  });
  const extras = a.extras.map((x) => labelOf(extraOptions(a), x));
  rows.push({
    step: "details",
    label: "Details",
    value:
      [extras.join(", "), a.notes.trim()].filter(Boolean).join(". ") || "None",
  });
  rows.push({
    step: "contact",
    label: "Contact",
    value: [a.name.trim(), a.email.trim(), a.phone.trim()]
      .filter(Boolean)
      .join(", "),
  });
  return rows;
}

/**
 * Answers that can travel in a link, so a quote in progress can be shared or
 * bookmarked. Anything personal (ZIP code, date, notes, contact details)
 * stays out of the URL.
 */
const SHAREABLE = [
  "service",
  "property",
  "bedrooms",
  "bathrooms",
  "area",
  "frequency",
  "condition",
  "timing",
] as const;

export function answersToParams(a: QuoteAnswers) {
  const params = new URLSearchParams();
  for (const key of SHAREABLE) {
    const value = a[key];
    if (value) params.set(key, value);
  }
  if (a.extras.length) params.set("extras", a.extras.join(","));
  return params;
}

/**
 * Answers read from a link. Each value is kept only if it is a real option
 * for the answers before it, so a hand-edited link can't produce a quote the
 * screen couldn't.
 */
export function answersFromParams(params: URLSearchParams) {
  const a: QuoteAnswers = { ...EMPTY_ANSWERS };
  const service = params.get("service");
  if (!SERVICE_OPTIONS.some((o) => o.value === service)) return {};
  a.service = service as ServiceValue;
  const property = params.get("property") ?? undefined;
  if (has(propertyOptions(a), property)) a.property = property;
  const pick = (
    key:
      | "bedrooms"
      | "bathrooms"
      | "area"
      | "frequency"
      | "condition"
      | "timing",
    options: Option[] | string[],
  ) => {
    const value = params.get(key) ?? undefined;
    if (has(options, value)) a[key] = value;
  };
  pick("bedrooms", BEDROOMS);
  pick("bathrooms", BATHROOMS);
  pick("area", AREAS);
  pick("frequency", frequencyOptions(a));
  pick("condition", conditionOptions(a));
  pick("timing", TIMINGS);
  const extras = (params.get("extras") ?? "").split(",");
  a.extras = extras.filter(
    (x, i) => has(extraOptions(a), x) && extras.indexOf(x) === i,
  );

  const shared: Partial<QuoteAnswers> = {};
  for (const key of SHAREABLE)
    if (a[key]) Object.assign(shared, { [key]: a[key] });
  if (a.extras.length) shared.extras = a.extras;
  return shared;
}

/**
 * With client accounts on, a signed-out visitor answers only these questions.
 * Where, when, notes and contact details come after signing in.
 */
const PRE_ACCOUNT_STEPS: StepId[] = [
  "service",
  "property",
  "size",
  "frequency",
  "condition",
];

export function preAccountSteps(a: QuoteAnswers): StepId[] {
  return stepsFor(a).filter(
    (step) => step === "review" || PRE_ACCOUNT_STEPS.includes(step),
  );
}

/**
 * The only answers kept for a signed-out visitor, and carried through sign-in.
 * An explicit list, each value a real option (so free text can't arrive in
 * one of these fields); nothing else on an answer set survives this.
 */
const CARRIED = [
  "service",
  "property",
  "bedrooms",
  "bathrooms",
  "area",
  "frequency",
  "condition",
] as const;

export function carriedAnswers(a: Partial<QuoteAnswers>): QuoteAnswers {
  const params = new URLSearchParams();
  for (const key of CARRIED) {
    const value = a[key];
    if (value) params.set(key, value);
  }
  return { ...EMPTY_ANSWERS, extras: [], ...answersFromParams(params) };
}

/** The first question still to answer, or the review when all are done. */
export function firstOpenStep(a: QuoteAnswers): StepId {
  return stepsFor(a).find((s) => stepError(s, a)) ?? "review";
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

const optional = (max: number) => z.string().trim().max(max).optional();

/** Server-side shape check. Option membership is checked with stepError. */
export const quoteSchema = z
  .object({
    service: z.enum(SERVICE_VALUES),
    property: optional(40),
    bedrooms: optional(10),
    bathrooms: optional(10),
    area: optional(20),
    frequency: optional(20),
    condition: optional(20),
    zip: optional(5),
    timing: optional(20),
    date: optional(10),
    extras: z.array(z.string().max(40)).max(12),
    notes: z.string().max(1000),
    name: z.string().trim().max(100),
    email: z.string().trim().max(200),
    phone: z.string().trim().max(30),
  })
  .superRefine((a, ctx) => {
    for (const step of stepsFor(a)) {
      const error = stepError(step, a);
      if (error) ctx.addIssue({ code: "custom", path: [step], message: error });
    }
  });
