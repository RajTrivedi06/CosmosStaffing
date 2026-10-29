import type { Metadata } from "next";
import { Suspense } from "react";
import { QuoteFlow } from "@/components/quote/QuoteFlow";

export const metadata: Metadata = {
  title: "Get my price",
  description:
    "Answer a few questions about your space and we'll prepare a personal cleaning quote.",
};

/** The guided quote, separate from the landing page. */
export default function QuotePage() {
  return (
    // useSearchParams (for ?service=) needs a Suspense boundary.
    <Suspense>
      <QuoteFlow />
    </Suspense>
  );
}
