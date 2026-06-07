"use client";

import { useMediaQuery } from "@/lib/hooks";

/**
 * Single source of truth for reduced-motion. `false` (motion on) on the server
 * and during hydration, then tracks `prefers-reduced-motion`. All motion
 * primitives gate on this so behavior stays consistent.
 */
export function useReducedMotionSafe(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
