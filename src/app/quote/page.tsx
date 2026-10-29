import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { QuoteFlow } from "@/components/quote/QuoteFlow";

export const metadata: Metadata = pageMetadata({
  title: "Get my price",
  description:
    "Answer a few questions about your space and we'll prepare a personal cleaning quote.",
  path: "/quote",
});

/** The guided quote, separate from the landing page. */
export default function QuotePage() {
  return <QuoteFlow />;
}
