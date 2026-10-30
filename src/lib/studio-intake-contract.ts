// Intake v1 schema copied from Studio c456d95, features/website-intake/schema.ts.
// Keep upstream validation in sync with the canonical handoff; website phone is stricter.
import { z } from "zod";

export const MAX_INTAKE_BYTES = 16_000;
const property = [
  "house",
  "apartment",
  "townhouse",
  "office",
  "retail",
  "commercial",
] as const;
const homeExtras = ["pets", "oven", "fridge", "windows", "sensitivities"];
const workExtras = ["after-hours", "kitchen", "restrooms", "security"];
const bounded = (maximum: number) =>
  z.string().refine((value) => Array.from(value).length <= maximum);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      Number(value.slice(0, 4)) > 0 &&
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  });

/** Versioned website answers, not pricing inputs. Unknown/privileged keys fail closed. */
export const websiteAnswersSchema = z
  .strictObject({
    service: z.enum(["regular", "deep", "move", "office", "other"]),
    property: z.enum(property),
    bedrooms: z.enum(["Studio", "1", "2", "3", "4", "5+"]).optional(),
    bathrooms: z.enum(["1", "2", "3", "4+"]).optional(),
    area: z
      .enum(["under-1500", "1500-4000", "4000-10000", "over-10000", "unsure"])
      .optional(),
    frequency: z
      .enum(["weekly", "biweekly", "monthly", "unsure", "several"])
      .optional(),
    condition: z.enum(["kept", "some", "lots", "empty", "partly", "furnished"]),
    zip: z.string().regex(/^\d{5}$/),
    timing: z.enum(["asap", "two-weeks", "month", "flexible", "date"]),
    date: date.optional(),
    extras: z
      .array(
        z.enum([
          "pets",
          "oven",
          "fridge",
          "windows",
          "sensitivities",
          "after-hours",
          "kitchen",
          "restrooms",
          "security",
        ]),
      )
      .max(12),
    notes: bounded(1000),
    name: bounded(100).refine((value) => value.trim().length > 0),
    email: bounded(200).refine((value) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    ),
    phone: bounded(30),
  })
  .superRefine((answers, ctx) => {
    const work = ["office", "retail", "commercial"].includes(answers.property);
    const invalid = (field: string) =>
      ctx.addIssue({
        code: "custom",
        path: [field],
        message: "Invalid conditional answer",
      });
    if (answers.service === "office" && !work) invalid("property");
    if (!["office", "other"].includes(answers.service) && work)
      invalid("property");
    if (work ? !answers.area : !answers.bedrooms || !answers.bathrooms)
      invalid("area");
    if (["regular", "office"].includes(answers.service) && !answers.frequency)
      invalid("frequency");
    if (!work && answers.frequency === "several") invalid("frequency");
    if (
      !(
        answers.service === "move"
          ? ["empty", "partly", "furnished"]
          : ["kept", "some", "lots"]
      ).includes(answers.condition)
    )
      invalid("condition");
    if (answers.timing === "date" && !answers.date) invalid("date");
    if (
      !answers.extras.every((extra) =>
        (work ? workExtras : homeExtras).includes(extra),
      )
    )
      invalid("extras");
  });

export const websiteIntakeSchema = z.strictObject({
  version: z.literal(1),
  submission_id: z.uuid(),
  // No client/user ID may be asserted until a verified auth adapter is specified.
  identity: z.strictObject({ status: z.literal("pending") }),
  answers: websiteAnswersSchema,
});
export type WebsiteIntake = z.infer<typeof websiteIntakeSchema>;
