import { enquirySchema } from "@/lib/enquiry";

/**
 * POST /api/enquiry — receives a Request Talent / enquiry submission.
 *
 * Scaffold: validates the payload with the shared zod schema and acknowledges
 * receipt, but does not yet deliver the enquiry anywhere. Wire up delivery
 * where the TODO is below once a provider is chosen.
 */
export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const result = enquirySchema.safeParse(payload);
  if (!result.success) {
    return Response.json(
      { ok: false, error: "Validation failed." },
      { status: 422 },
    );
  }

  // TODO: deliver the enquiry — e.g. send an email (Resend/SendGrid), push to a
  // CRM, or persist to a database. For now we only log it server-side.
  console.info("New enquiry received:", result.data);

  return Response.json({ ok: true }, { status: 200 });
}
