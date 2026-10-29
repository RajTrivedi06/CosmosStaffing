import type Lenis from "lenis";

/**
 * Shared scroll control. <LenisProvider> registers the smooth-scroll instance
 * here so the menu can pause it and in-page links can glide with it. Without
 * Lenis (reduced motion) everything falls back to native scrolling.
 */
let lenis: Lenis | null = null;

export function setLenis(instance: Lenis | null) {
  lenis = instance;
}

export function getLenis() {
  return lenis;
}

/**
 * Anchors whose useful position is not the element's top, e.g. a pinned scene
 * that should be shown finished. <DayScroll> registers these.
 */
const targets = new Map<string, () => number>();

export function registerScrollTarget(id: string, getY: () => number) {
  targets.set(id, getY);
  return () => {
    targets.delete(id);
  };
}

/** True while a scroll started by `scrollToY` is still gliding. */
let gliding = false;
let glideTimer: ReturnType<typeof setTimeout> | undefined;

export function isGliding() {
  return gliding;
}

export function scrollToY(y: number, { immediate = false } = {}) {
  if (lenis) {
    gliding = !immediate;
    // onComplete does not fire if the user takes over mid-glide.
    clearTimeout(glideTimer);
    glideTimer = setTimeout(() => (gliding = false), 1500);
    lenis.scrollTo(y, {
      immediate,
      duration: 1.2,
      force: true,
      onComplete: () => {
        gliding = false;
      },
    });
  } else {
    window.scrollTo({ top: y, behavior: immediate ? "auto" : "smooth" });
  }
}

/**
 * Scroll so the section named by `hash` fills the screen from the very top
 * (the fixed header floats over its padding). Returns false when the page has
 * no such target, so the caller can let the browser handle the link.
 */
export function scrollToHash(hash: string, { immediate = false } = {}) {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  if (!id) {
    scrollToY(0, { immediate });
    return true;
  }
  const custom = targets.get(id);
  const el = document.getElementById(id);
  if (!custom && !el) return false;

  const y = custom
    ? custom()
    : el!.getBoundingClientRect().top + window.scrollY;
  scrollToY(Math.max(0, Math.round(y)), { immediate });
  return true;
}
