"use client";

import { useMediaQuery } from "@/lib/hooks";
import { REDUCED_MOTION_QUERY } from "@/lib/motion";

/**
 * Tracks `prefers-reduced-motion` so motion effects re-run when it changes.
 * It reads `false` during hydration, so effects should check
 * `prefersReducedMotion()` for the real value rather than trust this alone.
 */
export function useReducedMotionSafe(): boolean {
  return useMediaQuery(REDUCED_MOTION_QUERY);
}
