import type { Client } from "./server";

/**
 * What the account home shows. The Studio owns every one of these records and
 * links a signed-in client to them; this site only displays what it is given.
 *
 * This is the website's display shape, not an upstream contract. The Studio's
 * versioned account contract is not published yet, so `accountOverview`
 * reports "not_connected" and nothing is shown. When the contract arrives, an
 * adapter maps it onto these types; statuses and dates come from the Studio
 * verbatim. Never fill this with sample data or infer a booking.
 */
export type AccountItem = {
  /** The Studio's reference; display only. */
  id: string;
  title: string;
  /** The Studio's own status wording, e.g. "Received" or "Quote sent". */
  status: string;
  /** A date or time the Studio supplied, already formatted for display. */
  when?: string;
  /** A Studio recipient page (/q/… or /pay/…), opened with a full page load. */
  href?: string;
  action?: string;
};

export type AccountOverview =
  | { status: "not_connected" }
  | { status: "unavailable" }
  | {
      status: "ready";
      quotes: AccountItem[];
      requests: AccountItem[];
      upcoming: AccountItem[];
      completed: AccountItem[];
      /** Null where the Studio doesn't report payments. */
      payments: AccountItem[] | null;
    };

export async function accountOverview(
  client: Client,
): Promise<AccountOverview> {
  void client;
  return { status: "not_connected" };
}
