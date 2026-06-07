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

const emptySubscribe = () => () => {};

/** `false` on the server / first render, `true` once mounted on the client. */
export function useMounted(): boolean {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

/** `true` once the window has scrolled past `threshold` px. */
export function useScrolledPast(threshold: number): boolean {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("scroll", onChange, { passive: true });
      return () => window.removeEventListener("scroll", onChange);
    },
    () => window.scrollY > threshold,
    () => false,
  );
}
