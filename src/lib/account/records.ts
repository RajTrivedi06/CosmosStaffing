import {
  customerApiConfig,
  readAccount,
  readRequest,
  readRequests,
} from "@/lib/customer-api";
import type { RequestDetail } from "@/lib/customer-api-contract";
import { verifiedAccess } from "./server";
import {
  PAYMENT_REQUEST,
  formatCents,
  formatWhen,
  requestFacts,
  requestGroup,
} from "./labels";

/**
 * What the account home shows, from the Studio's customer API v2 (contract
 * revision 2.1). The Studio owns these records and decides whose they are;
 * this site shows only what it returns, never sample data or a guess.
 */
export type AccountItem = {
  /** The Studio's reference; display only. */
  id: string;
  title: string;
  /** Separate facts, each from the Studio (labels.ts). */
  facts: string[];
  /**
   * This site's request page, or a Studio recipient page (/q/…, /pay/…)
   * opened with a full page load.
   */
  href?: string;
  action?: string;
};

export type AccountOverview =
  /** The customer API isn't configured here. */
  | { status: "not_connected" }
  | { status: "unavailable" }
  /** The Studio didn't accept this session; sign in again. */
  | { status: "signin" }
  | { status: "unverified" }
  | {
      status: "ready";
      quotes: AccountItem[];
      requests: AccountItem[];
      upcoming: AccountItem[];
      completed: AccountItem[];
      /** Payments are shown per request, where the Studio reports them. */
      payments: AccountItem[] | null;
      /** Studio's opaque cursor for older requests, if any. */
      nextCursor: string | null;
      /** Some quotes to review couldn't be loaded. */
      quotesIncomplete: boolean;
    };

const empty = (): Extract<AccountOverview, { status: "ready" }> => ({
  status: "ready",
  quotes: [],
  requests: [],
  upcoming: [],
  completed: [],
  payments: null,
  nextCursor: null,
  quotesIncomplete: false,
});

/** At most this many quoted requests are opened to find quotes to review. */
const QUOTE_LOOKUPS = 5;

/** A sent quote the client can still act on: current, unaccepted, unexpired. */
export function openQuote(detail: RequestDetail, now = Date.now()) {
  return (
    detail.quotes
      .filter(
        (quote) =>
          !quote.superseded &&
          !quote.accepted_at &&
          Date.parse(quote.link_expires_at) > now,
      )
      .sort((a, b) => b.version - a.version)[0] ?? null
  );
}

export async function accountOverview(
  cursor: string | null,
): Promise<AccountOverview> {
  if (!customerApiConfig()) return { status: "not_connected" };
  const access = await verifiedAccess();
  if (!access) return { status: "signin" };

  const account = await readAccount(access.token);
  if (!account.ok) return failed(account.reason);
  // Not linked yet: no request has been received from this account.
  if (!account.data.linked) return empty();

  const page = await readRequests(access.token, cursor);
  if (!page.ok) return failed(page.reason);

  const quoted = page.data.items
    .filter((r) => r.sales_status === "quoted" && !r.quote_accepted)
    .slice(0, QUOTE_LOOKUPS);
  const details = await Promise.all(
    quoted.map((r) => readRequest(access.token, r.request_id)),
  );
  const quotes: AccountItem[] = [];
  details.forEach((detail, i) => {
    if (!detail.ok) return;
    const quote = openQuote(detail.data);
    if (!quote) return;
    quotes.push({
      id: quote.quote_id,
      title: `Quote for request #${quoted[i].job_number}`,
      facts: [
        `${formatCents(quote.total_cents)} total`,
        `Sent ${formatWhen(quote.sent_at)}`,
        `Open until ${formatWhen(quote.link_expires_at)}`,
      ],
      href: `/q/${quote.token}`,
      action: "Review quote",
    });
  });

  const groups = { requests: [], upcoming: [], completed: [] } as Record<
    "requests" | "upcoming" | "completed",
    AccountItem[]
  >;
  for (const request of page.data.items)
    groups[requestGroup(request)].push({
      id: request.request_id,
      title: `Request #${request.job_number} · ${formatWhen(request.submitted_at, false)}`,
      facts: requestFacts(request),
      href: `/account/requests/${request.request_id}`,
      action: "Details",
    });

  return {
    status: "ready",
    quotes,
    ...groups,
    payments: null,
    nextCursor: page.data.next_cursor,
    quotesIncomplete:
      details.some((d) => !d.ok) ||
      page.data.items.filter(
        (r) => r.sales_status === "quoted" && !r.quote_accepted,
      ).length > QUOTE_LOOKUPS,
  };
}

function failed(
  reason: "off" | "unauthorized" | "unverified" | "not_found" | "unavailable",
): AccountOverview {
  if (reason === "off") return { status: "not_connected" };
  if (reason === "unauthorized") return { status: "signin" };
  if (reason === "unverified") return { status: "unverified" };
  return { status: "unavailable" };
}

/**
 * Whether the Studio still accepts this session. The local token can verify
 * while the session behind it is revoked, and Studio pages then send the
 * client back to sign-in. Only a definite refusal counts; with the customer
 * API off or unreachable, there's nothing to contradict the local check.
 */
export async function studioRefusesSession() {
  if (!customerApiConfig()) return false;
  const access = await verifiedAccess();
  if (!access) return false;
  const account = await readAccount(access.token);
  return !account.ok && account.reason === "unauthorized";
}

export type RequestPage =
  | {
      status:
        | "not_connected"
        | "unavailable"
        | "signin"
        | "unverified"
        | "not_found";
    }
  | {
      status: "ready";
      request: RequestDetail;
      quotes: AccountItem[];
      payments: AccountItem[];
    };

/** One request with its quotes and payment requests. Another client's reads as not found. */
export async function requestPage(id: string): Promise<RequestPage> {
  if (!customerApiConfig()) return { status: "not_connected" };
  const access = await verifiedAccess();
  if (!access) return { status: "signin" };
  const result = await readRequest(access.token, id);
  if (result.ok) return { status: "ready", ...requestItems(result.data) };
  if (result.reason === "not_found") return { status: "not_found" };
  return failed(result.reason) as RequestPage;
}

/**
 * A request's sent quotes and payment requests as list items. Links go to
 * the Studio's own pages, which check ownership and expiry again.
 */
export function requestItems(request: RequestDetail, now = Date.now()) {
  const quotes: AccountItem[] = request.quotes.map((quote) => {
    const open =
      !quote.superseded &&
      !quote.accepted_at &&
      Date.parse(quote.link_expires_at) > now;
    return {
      id: quote.quote_id,
      title: `Quote ${quote.version} · ${formatCents(quote.total_cents)}`,
      facts: [
        `Sent ${formatWhen(quote.sent_at)}`,
        quote.accepted_at
          ? `Accepted ${formatWhen(quote.accepted_at)}`
          : quote.superseded
            ? "Replaced by a newer quote"
            : open
              ? `Open until ${formatWhen(quote.link_expires_at)}`
              : "Link expired",
        ...(quote.changes_requested_at && !quote.accepted_at
          ? [`Changes requested ${formatWhen(quote.changes_requested_at)}`]
          : []),
      ],
      href: open || quote.accepted_at ? `/q/${quote.token}` : undefined,
      action: open ? "Review quote" : "View quote",
    };
  });
  const payments: AccountItem[] = request.payment_requests.map((payment) => {
    const due =
      payment.status === "open" && Date.parse(payment.expires_at) > now;
    return {
      id: payment.payment_request_id,
      title: `${formatCents(payment.amount_cents)} · ${payment.description}`,
      facts: [
        PAYMENT_REQUEST[payment.status] ?? "Status not shown",
        payment.paid_at
          ? `Paid ${formatWhen(payment.paid_at)}`
          : due
            ? `Pay by ${formatWhen(payment.expires_at)}`
            : payment.status === "open"
              ? "Link expired"
              : "",
      ].filter(Boolean),
      href: due ? `/pay/${payment.token}` : undefined,
      action: "Pay",
    };
  });
  return { request, quotes, payments };
}
