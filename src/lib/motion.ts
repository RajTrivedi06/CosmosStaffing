/**
 * Motion on or off for the whole site. `<html data-motion="on">` is set before
 * the first paint by MOTION_SCRIPT (see the root layout) when JavaScript runs
 * and the visitor has not asked for reduced motion. Scroll scenes are styled
 * for motion only under that attribute, so without it (reduced motion, or no
 * JavaScript) every scene renders as a still, finished layout.
 */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export const MOTION_SCRIPT = `document.documentElement.dataset.motion=matchMedia(${JSON.stringify(REDUCED_MOTION_QUERY)}).matches?"off":"on"`;

/** Read the preference directly, so effects never act on a stale value. */
export function prefersReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Keep the attribute in step if the preference changes while the page is open. */
export function setMotionAttribute(reduced: boolean) {
  document.documentElement.dataset.motion = reduced ? "off" : "on";
}
