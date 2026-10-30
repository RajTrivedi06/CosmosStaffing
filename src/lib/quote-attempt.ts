import { z } from "zod";
import { quoteSchema, spaceKind, type QuoteAnswers } from "@/lib/quote";
import { websiteIntakeSchema } from "@/lib/studio-intake-contract";

export const ATTEMPT_KEY = "cosmos-quote-attempt";
export const attemptSchema = z.strictObject({
  submission_id: z.uuid(),
  answers: quoteSchema.strict(),
});
export type QuoteAttempt = z.infer<typeof attemptSchema>;

/** Detached snapshot. Edits to the draft must never change an in-flight retry. */
export function createQuoteAttempt(answers: QuoteAnswers): QuoteAttempt {
  return JSON.parse(
    JSON.stringify({ submission_id: crypto.randomUUID(), answers }),
  );
}

export function readQuoteAttempt(raw: string | null): QuoteAttempt | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    // Validate, but retain the exact stored snapshot rather than trimmed output.
    return attemptSchema.safeParse(value).success
      ? (value as QuoteAttempt)
      : null;
  } catch {
    return null;
  }
}

/** Only applicable fields travel upstream; capped ranges remain strings. */
export function toStudioIntake(attempt: QuoteAttempt) {
  const a = quoteSchema.strict().parse(attempt.answers);
  const work = spaceKind(a) === "work";
  return websiteIntakeSchema.parse({
    version: 1,
    submission_id: attempt.submission_id,
    identity: { status: "pending" },
    answers: {
      service: a.service,
      property: a.property,
      ...(work
        ? { area: a.area }
        : { bedrooms: a.bedrooms, bathrooms: a.bathrooms }),
      ...(["regular", "office"].includes(a.service!)
        ? { frequency: a.frequency }
        : {}),
      condition: a.condition,
      zip: a.zip,
      timing: a.timing,
      ...(a.timing === "date" ? { date: a.date } : {}),
      extras: a.extras,
      notes: a.notes,
      name: a.name,
      email: a.email,
      phone: a.phone,
    },
  });
}

export const studioAcknowledgment = z.strictObject({
  ok: z.literal(true),
  receipt_id: z.uuid(),
  status: z.literal("received"),
});

export function confirmedQuote(
  status: number,
  body: unknown,
  /** Customer intake: only the Studio's committed receipt counts. */
  receiptOnly = false,
): boolean {
  if (status !== 200 && status !== 202) return false;
  if (studioAcknowledgment.safeParse(body).success) return true;
  // Existing legacy facade acknowledgment, distinct from Studio's receipt.
  return (
    !receiptOnly &&
    status === 200 &&
    z
      .strictObject({
        ok: z.literal(true),
        id: z.string().trim().min(1),
      })
      .safeParse(body).success
  );
}
