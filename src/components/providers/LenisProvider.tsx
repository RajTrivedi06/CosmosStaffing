"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";
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
 */
export function LenisProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotionSafe();
  const pathname = usePathname();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    if (reduced) {
      // Native scroll; make sure any triggers measure against it.
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
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
  }, [reduced]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
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
  }, [reduced, pathname]);

  return <>{children}</>;
}
