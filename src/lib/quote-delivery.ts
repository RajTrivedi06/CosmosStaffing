import { SERVICE_OPTIONS, summarize, type QuoteAnswers } from "@/lib/quote";

/**
 * Where quote requests go: stored in Supabase, then emailed to the team.
 * Configure in `.env.local` (see `.env.example`):
 *
 *   SUPABASE_URL          project URL
 *   SUPABASE_SECRET_KEY   secret key (sb_secret_…), server only, never NEXT_PUBLIC_
 *   RESEND_API_KEY        API key from the Resend dashboard
 *   QUOTE_TO_EMAIL        inbox that receives quote requests
 *   QUOTE_FROM_EMAIL      sender on a domain verified in Resend
 *
 * A request counts as delivered if it was stored or emailed. With neither
 * configured, nothing is delivered and the quote screen says so honestly.
 */
export type DeliveryOutcome = "sent" | "not_configured" | "failed";
type Step = "ok" | "failed" | "not_configured";

export async function deliverQuote(
  answers: QuoteAnswers,
  requestId: string,
): Promise<{ outcome: DeliveryOutcome; stored: Step; emailed: Step }> {
  const row = await storeQuote(answers, requestId);
  const emailed = await emailQuote(answers, requestId);
  const stored = row.step;
  if (row.id) await setEmailStatus(row.id, emailed);

  const outcome: DeliveryOutcome =
    stored === "ok" || emailed === "ok"
      ? "sent"
      : stored === "not_configured" && emailed === "not_configured"
        ? "not_configured"
        : "failed";
  return { outcome, stored, emailed };
}

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return {
    endpoint: `${url.replace(/\/$/, "")}/rest/v1/quote_requests`,
    // New-style keys go on the apikey header only; they are not JWTs.
    headers: { apikey: key, "Content-Type": "application/json" },
  };
}

async function storeQuote(
  answers: QuoteAnswers,
  requestId: string,
): Promise<{ step: Step; id?: string }> {
  const db = supabase();
  if (!db) return { step: "not_configured" };
  try {
    const res = await fetch(db.endpoint, {
      method: "POST",
      headers: { ...db.headers, Prefer: "return=representation" },
      body: JSON.stringify({
        request_id: requestId,
        service: answers.service,
        zip: answers.zip,
        name: answers.name.trim(),
        email: answers.email.trim(),
        phone: answers.phone.trim() || null,
        answers,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { step: "failed" };
    const [created] = (await res.json()) as { id: string }[];
    return { step: "ok", id: created?.id };
  } catch {
    return { step: "failed" };
  }
}

async function setEmailStatus(id: string, emailed: Step) {
  const db = supabase();
  if (!db) return;
  const status = emailed === "ok" ? "sent" : emailed;
  try {
    await fetch(`${db.endpoint}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { ...db.headers, Prefer: "return=minimal" },
      body: JSON.stringify({ email_status: status }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // The request is stored; a stale email_status is not worth failing over.
  }
}

async function emailQuote(
  answers: QuoteAnswers,
  requestId: string,
): Promise<Step> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.QUOTE_TO_EMAIL;
  const from = process.env.QUOTE_FROM_EMAIL;
  if (!key || !to || !from) return "not_configured";

  const service =
    SERVICE_OPTIONS.find((o) => o.value === answers.service)?.label ?? "Quote";
  const text = [
    `New quote request (${requestId})`,
    "",
    ...summarize(answers).map((row) => `${row.label}: ${row.value}`),
  ].join("\n");

  try {
    // RESEND_API_URL exists only so delivery can be tested against a stub.
    const res = await fetch(
      process.env.RESEND_API_URL || "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          reply_to: answers.email.trim(),
          subject: `Quote request: ${service}, ${answers.zip}`,
          text,
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    return res.ok ? "ok" : "failed";
  } catch {
    return "failed";
  }
}
