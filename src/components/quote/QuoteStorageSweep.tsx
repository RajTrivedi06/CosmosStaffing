"use client";

import { useEffect } from "react";

/**
 * Removes quote data that shouldn't stay in this browser (see
 * settleQuoteStorage). Runs on every page, so a returning visitor who never
 * reopens the quote is covered too; the store loads only when there's work.
 */
export function QuoteStorageSweep({ owner }: { owner?: string | null }) {
  useEffect(() => {
    let stored = false;
    try {
      stored = [localStorage, sessionStorage].some((list) =>
        Array.from({ length: list.length }, (_, i) => list.key(i)).some((key) =>
          key?.startsWith("cosmos-quote-"),
        ),
      );
    } catch {
      return;
    }
    if (stored)
      void import("@/lib/quote-store").then((store) =>
        store.settleQuoteStorage(owner),
      );
  }, [owner]);
  return null;
}
