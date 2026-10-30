import type { RequestSummary } from "@/lib/customer-api-contract";

/**
 * Plain wording for the Studio's own status values (customer API v2). Each
 * is a separate fact: a request's progress, whether a quote was accepted,
 * whether a cleaning is booked, and payment. Acceptance is never shown as a
 * booking, and a booking is only `service_status: confirmed`. Unknown values
 * add nothing rather than a guess.
 */
const REQUEST: Record<string, string> = {
  new: "Request received",
  qualifying: "Being reviewed",
  quoted: "Quote sent",
  won: "Accepted",
  lost: "Closed",
};
const PAYMENT: Record<string, string> = {
  paid: "Paid",
  partly_paid: "Partly paid",
  partly_refunded: "Partly refunded",
};

/** Texas time, where Cosmos works; the zone is always shown. */
export function formatWhen(iso: string, withTime = true) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: withTime ? "short" : undefined,
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime
      ? { hour: "numeric", minute: "2-digit", timeZoneName: "short" }
      : {}),
  }).format(new Date(iso));
}

export function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function requestFacts(request: RequestSummary): string[] {
  const facts: string[] = [];
  const progress = REQUEST[request.sales_status];
  if (progress) facts.push(progress);
  if (request.quote_accepted && request.sales_status !== "won")
    facts.push("Quote accepted");
  switch (request.service_status) {
    case "confirmed":
      facts.push(
        request.scheduled_start_at
          ? `Booked for ${formatWhen(request.scheduled_start_at)}`
          : "Booked",
      );
      break;
    case "held":
      facts.push("Scheduling in progress");
      break;
    case "in_progress":
      facts.push("Cleaning in progress");
      break;
    case "completed":
      facts.push("Cleaning completed");
      break;
    case "cancelled":
      facts.push("Cancelled");
      break;
    case "unassigned":
      if (request.quote_accepted) facts.push("Not scheduled yet");
      break;
  }
  const paid = PAYMENT[request.payment_status];
  if (paid) facts.push(paid);
  return facts;
}

/** Where a request belongs on the account home. */
export function requestGroup(
  request: RequestSummary,
): "upcoming" | "completed" | "requests" {
  if (["confirmed", "in_progress"].includes(request.service_status))
    return "upcoming";
  if (request.service_status === "completed") return "completed";
  return "requests";
}

export const PAYMENT_REQUEST: Record<string, string> = {
  open: "Due",
  paid: "Paid",
  cancelled: "Cancelled",
};
