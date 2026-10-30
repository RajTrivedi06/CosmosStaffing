import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { quoteIntakeMode } from "@/lib/quote-intake";
import { clientSession } from "@/lib/account/server";
import { ownerTag } from "@/lib/account/owner";
import { pageMetadata } from "@/lib/metadata";
import { QuoteFlow } from "@/components/quote/QuoteFlow";

export const metadata: Metadata = pageMetadata({
  title: "Get my price",
  description:
    "Answer a few questions about your space and we'll prepare a personal cleaning quote.",
  path: "/quote",
});

export const viewport: Viewport = {
  themeColor: "#f4efe7",
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

/** The guided quote, separate from the landing page. */
export default async function QuotePage() {
  // Read the same runtime cutover setting as /api/quote.
  await connection();
  const session = await clientSession();
  return (
    <QuoteFlow
      intakeMode={quoteIntakeMode()}
      accountsOn={session.state !== "off"}
      account={
        session.state === "signed_in"
          ? {
              email: session.client.email,
              owner: ownerTag(session.client.id),
            }
          : null
      }
    />
  );
}
