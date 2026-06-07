"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";

/**
 * Site-wide smooth inertia scrolling (Lenis), integrated with GSAP so pinned
 * ScrollTriggers stay in sync: ScrollTrigger.update is driven from Lenis's
 * scroll event, and Lenis is advanced from GSAP's ticker.
 *
 * Under reduced motion we skip Lenis entirely and fall back to native scroll.
 */
export function LenisProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotionSafe();

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

    lenis.on("scroll", ScrollTrigger.update);

    const onRaf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(onRaf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.off("scroll", ScrollTrigger.update);
      gsap.ticker.remove(onRaf);
      lenis.destroy();
    };
  }, [reduced]);

  return <>{children}</>;
}
