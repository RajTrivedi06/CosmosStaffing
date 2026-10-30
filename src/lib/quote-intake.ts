/** Website-only cutover control. This is not a Studio API contract. */
export type QuoteIntakeMode = "legacy" | "studio_pending";

export function quoteIntakeMode(): QuoteIntakeMode {
  const mode = process.env.QUOTE_DELIVERY_MODE;
  // Preserve the existing inbox until an explicit, coordinated cutover.
  if (!mode || mode === "legacy") return "legacy";
  // Client authentication remains unresolved. The server-only isolated adapter
  // does not unlock this customer-facing boundary.
  // Unknown configuration also fails closed; never fall back to legacy.
  return "studio_pending";
}
