"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribe to a CSS media query. SSR-safe (returns `false` on the server and
 * during hydration, then the real value) and avoids setState-in-effect.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
