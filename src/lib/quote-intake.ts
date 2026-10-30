import { authConfig } from "@/lib/account/config";
import { customerApiConfig } from "@/lib/customer-api";

/**
 * Website-only cutover control. This is not a Studio API contract.
 *
 * - legacy: the existing inbox (default).
 * - customer: the Studio's authenticated customer intake v2. Only when its
 *   adapter and client accounts are both configured; a signed-in, verified
 *   client is then required for every send.
 * - studio_pending: sending is switched off. Anything incomplete or unknown
 *   lands here; it never falls back to legacy or sends to two places.
 */
export type QuoteIntakeMode = "legacy" | "customer" | "studio_pending";

export function quoteIntakeMode(): QuoteIntakeMode {
  const mode = process.env.QUOTE_DELIVERY_MODE;
  // Preserve the existing inbox until an explicit, coordinated cutover.
  if (!mode || mode === "legacy") return "legacy";
  // Fail closed: v2 needs both the customer API and client accounts.
  if (mode === "customer")
    return customerApiConfig() && authConfig() ? "customer" : "studio_pending";
  // "studio" (the isolated v1 test adapter) keeps the browser blocked, as
  // before; unknown values also fail closed.
  return "studio_pending";
}
