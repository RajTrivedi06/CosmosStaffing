import {
  EMPTY_ANSWERS,
  conditionOptions,
  extraOptions,
  firstOpenStep,
  frequencyOptions,
  propertyOptions,
  quoteSchema,
  stepsFor,
  type QuoteAnswers,
  type StepId,
} from "@/lib/quote";

export type QuoteDraft = { answers: QuoteAnswers; step: StepId };
export const DRAFT_KEY = "cosmos-quote-draft";

/** Recover valid fields from an older/partial draft without trusting its shape. */
export function readQuoteDraft(raw: string | null): QuoteDraft | null {
  if (!raw) return null;
  try {
    const draft: unknown = JSON.parse(raw);
    if (!draft || typeof draft !== "object" || !("answers" in draft))
      return null;
    const stored = draft.answers;
    if (!stored || typeof stored !== "object" || Array.isArray(stored))
      return null;
    const answers: QuoteAnswers = { ...EMPTY_ANSWERS, extras: [] };
    for (const [key, schema] of Object.entries(quoteSchema.shape)) {
      if (!(key in stored)) continue;
      const result = schema.safeParse((stored as Record<string, unknown>)[key]);
      if (result.success && result.data !== undefined)
        Object.assign(answers, { [key]: result.data });
    }
    const restored = updateQuoteAnswers(answers, { service: answers.service });
    const step =
      "step" in draft && stepsFor(restored).includes(draft.step as StepId)
        ? (draft.step as StepId)
        : firstOpenStep(restored);
    return { answers: restored, step };
  } catch {
    return null;
  }
}

/** Keep unrelated answers; clear only choices that no longer fit a changed branch. */
export function updateQuoteAnswers(
  current: QuoteAnswers,
  patch: Partial<QuoteAnswers>,
): QuoteAnswers {
  const next = { ...current, ...patch };
  if (!("service" in patch) && !("property" in patch)) return next;
  if (!propertyOptions(next).some((o) => o.value === next.property))
    next.property = undefined;
  if (!conditionOptions(next).some((o) => o.value === next.condition))
    next.condition = undefined;
  if (!frequencyOptions(next).some((o) => o.value === next.frequency))
    next.frequency = undefined;
  const allowed = extraOptions(next);
  next.extras = next.extras.filter((value) =>
    allowed.some((o) => o.value === value),
  );
  return next;
}
