// Customer API v2 schemas copied from Studio cc738d2,
// features/customer-api/schema.ts (contract revision 2.1). Keep in sync with
// the canonical customer-auth-v2.md; tests/unit/customer-api.test.ts checks
// them against the implementation worktree when it is present.
import { z } from "zod";
import { websiteAnswersSchema } from "@/lib/studio-intake-contract";

/** Intake v2: no identity in the body; the bearer token is the identity. */
export const customerIntakeSchema = z.strictObject({
  version: z.literal(2),
  submission_id: z.uuid(),
  answers: websiteAnswersSchema,
});
export type CustomerIntake = z.infer<typeof customerIntakeSchema>;

export const accountSchema = z.strictObject({
  user_id: z.uuid(),
  email: z.email(),
  linked: z.boolean(),
});
const timestamp = z.iso.datetime({ offset: true });
export const requestSummarySchema = z.strictObject({
  request_id: z.uuid(),
  job_number: z.number().int(),
  submitted_at: timestamp,
  sales_status: z.string(),
  service_status: z.string(),
  scheduled_start_at: timestamp.nullable(),
  scheduled_end_at: timestamp.nullable(),
  quote_accepted: z.boolean(),
  payment_status: z.string(),
});
export type RequestSummary = z.infer<typeof requestSummarySchema>;
export const requestsSchema = z.strictObject({
  items: z.array(requestSummarySchema).max(50),
  next_cursor: z.string().nullable(),
});
const cents = z.number().int().nonnegative();
export const requestDetailSchema = requestSummarySchema.extend({
  answers: websiteAnswersSchema.nullable(),
  quotes: z
    .array(
      z.strictObject({
        quote_id: z.uuid(),
        token: z.uuid(),
        version: z.number().int(),
        client_price_cents: cents,
        discount_cents: cents,
        tax_cents: cents,
        tip_cents: cents,
        total_cents: cents,
        sent_at: timestamp,
        accepted_at: timestamp.nullable(),
        accepted_by_name: z.string().nullable(),
        changes_requested_at: timestamp.nullable(),
        superseded: z.boolean(),
        link_expires_at: timestamp,
      }),
    )
    .max(50),
  quotes_has_more: z.boolean(),
  payment_requests: z
    .array(
      z.strictObject({
        payment_request_id: z.uuid(),
        token: z.uuid(),
        amount_cents: cents,
        description: z.string(),
        status: z.string(),
        created_at: timestamp,
        expires_at: timestamp,
        paid_at: timestamp.nullable(),
      }),
    )
    .max(50),
  payment_requests_has_more: z.boolean(),
});
export type RequestDetail = z.infer<typeof requestDetailSchema>;

/** Every error body is exactly {ok:false, code}. */
export const customerErrorSchema = z.strictObject({
  ok: z.literal(false),
  code: z.string().max(64),
});
