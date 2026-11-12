"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";
import { prefersReducedMotion, setMotionAttribute } from "@/lib/motion";
import { scrollToHash, setLenis } from "@/lib/scroll";

/**
 * Site-wide smooth inertia scrolling (Lenis), integrated with GSAP so pinned
 * ScrollTriggers stay in sync: ScrollTrigger.update is driven from Lenis's
 * scroll event, and Lenis is advanced from GSAP's ticker.
 *
 * In-page links (`#how`, or `/#how` while already on `/`) are intercepted and
 * sent through `scrollToHash`, so every section lands flush with the top of
 * the screen and scenes with a registered target land finished.
 *
 * Under reduced motion we skip Lenis entirely and fall back to native scroll.
 * The preference is read directly, not from the hook, which reads "motion on"
 * during hydration and would otherwise start Lenis once for everyone.
 */
export function LenisProvider({ children }: { children: React.ReactNode }) {
  const reducedPref = useReducedMotionSafe();
  const pathname = usePathname();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduced = prefersReducedMotion();
    setMotionAttribute(reduced);

    if (reduced) {
      // Native scroll; make sure any triggers measure against it.
      ScrollTrigger.refresh();
      return;
    }

    // Lerp smoothing (Lenis's default) eases every frame toward the target,
    // so even a small wheel or trackpad nudge moves the page at once. The
    // fixed 1s ease-out it replaces left a long tail that made scroll-linked
    // scenes feel late. Touch keeps the device's own native scrolling.
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    setLenis(lenis);

    lenis.on("scroll", ScrollTrigger.update);

    const onRaf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(onRaf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.off("scroll", ScrollTrigger.update);
      gsap.ticker.remove(onRaf);
      setLenis(null);
      lenis.destroy();
    };
  }, [reducedPref]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const reduced = prefersReducedMotion();
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target) return;
      // The menu sheet scrolls after it has closed (see SiteNav).
      if (link.closest("#menu-sheet")) return;

      const url = new URL(link.href);
      const here = window.location;
      if (url.origin !== here.origin || url.pathname !== here.pathname) return;
      if (!url.hash) return;
      if (!scrollToHash(url.hash, { immediate: reduced })) return;

      e.preventDefault();
      history.pushState(null, "", url.hash);
      // Move keyboard focus to the destination without a second jump.
      const dest = document.getElementById(url.hash.slice(1));
      if (dest) {
        if (!dest.hasAttribute("tabindex")) dest.setAttribute("tabindex", "-1");
        dest.focus({ preventScroll: true });
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  return <>{children}</>;
}
