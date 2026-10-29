"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";
import { prefersReducedMotion } from "@/lib/motion";
import {
  isGliding,
  registerScrollTarget,
  scrollToHash,
  scrollToY,
} from "@/lib/scroll";

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const formatClock = (minutes: number) => {
  // Round first so 16:59.6 becomes 17:00, never 16:60.
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/**
 * The page as one day. Wraps <main> and drives every scroll scene:
 * - each `section[data-time]` warms the ground colour and advances the clock
 * - the hero frame opens to full screen and pushes toward the window
 * - framed photos open out as they arrive
 * - the workplaces frame opens to full screen
 * - the checklist ticks draw in
 * - the evening room crossfades from late sun to lamplight
 * - the phone booking bar shows between the hero and pricing, and again
 *   from the evening to the close
 *
 * Under reduced motion none of the scenes are built. With the CSS keyed to
 * `html[data-motion]` (see lib/motion.ts), every scene shows its finished,
 * still state: the hero framed with its copy, the workplaces photo full
 * screen with its words, the evening room lit. The ground colour and clock
 * still follow the section, without tweening.
 *
 * Copy in a scene fades with opacity only (never visibility), so screen
 * readers always have it. Faded links stop taking clicks, and tabbing into
 * faded copy scrolls its scene to the point where it shows.
 */
export function DayScroll({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLElement>(null);
  // Re-runs the effect when the preference changes. The effect reads the
  // real value itself, since this reads "motion on" during hydration.
  const reducedPref = useReducedMotionSafe();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    gsap.registerPlugin(ScrollTrigger);
    const reduced = prefersReducedMotion();
    const cleanups: (() => void)[] = [];

    const clock = document.getElementById("clock");
    const bar = document.getElementById("book-bar");
    const media = root.querySelector<HTMLElement>("#hero-media");
    const slot = root.querySelector<HTMLElement>("#frame-slot");

    // The hero clip-path is measured from the frame slot, so it stays exact
    // across breakpoints and re-measures on every ScrollTrigger refresh.
    let box = { t: 0, r: 0, b: 0, l: 0 };
    const open = { p: 0 };
    const setClip = () => {
      if (!media) return;
      const k = 1 - open.p;
      media.style.clipPath = `inset(${box.t * k}px ${box.r * k}px ${box.b * k}px ${box.l * k}px round ${6 * k}px)`;
    };
    const measure = () => {
      const stage = media?.parentElement;
      if (!stage || !slot) return;
      const s = stage.getBoundingClientRect();
      const r = slot.getBoundingClientRect();
      box = {
        t: r.top - s.top,
        r: s.right - r.right,
        b: s.bottom - r.bottom,
        l: r.left - s.left,
      };
      setClip();
    };
    measure();
    ScrollTrigger.addEventListener("refreshInit", measure);

    // The workplaces frame works the same way. Its starting inset mirrors
    // `.band-media` in globals.css. Tweening the CSS clip-path directly mixed
    // a two-value start with a four-value end, so the left and bottom edges
    // snapped open on the first frame.
    const band = root.querySelector<HTMLElement>("#band-media");
    let bandBox = { t: 0, r: 0, b: 0, l: 0 };
    const bandOpen = { p: 0 };
    const setBandClip = () => {
      if (!band) return;
      const k = 1 - bandOpen.p;
      band.style.clipPath = `inset(${bandBox.t * k}px ${bandBox.r * k}px ${bandBox.b * k}px ${bandBox.l * k}px round ${6 * k}px)`;
    };
    const measureBand = () => {
      if (reduced) return;
      const h = band?.parentElement?.clientHeight ?? window.innerHeight;
      const w = window.innerWidth;
      bandBox = window.matchMedia("(max-aspect-ratio: 3/4)").matches
        ? { t: 0.14 * h, r: 0.08 * w, b: 0.3 * h, l: 0.08 * w }
        : { t: 0.12 * h, r: 0.22 * w, b: 0.12 * h, l: 0.22 * w };
      setBandClip();
    };
    measureBand();
    ScrollTrigger.addEventListener("refreshInit", measureBand);
    let bandRest: ReturnType<typeof setTimeout> | undefined;

    /** Faded copy stops taking clicks, so hidden buttons can't be hit. */
    const syncHits = (...els: (HTMLElement | null)[]) => {
      for (const el of els) {
        if (!el) continue;
        const shown = Number(gsap.getProperty(el, "opacity")) > 0.5;
        el.style.pointerEvents = shown ? "" : "none";
      }
    };
    /** Tabbing into faded copy scrolls to where its scene shows it. */
    const revealOnFocus = (el: HTMLElement | null, getY: () => number) => {
      if (!el) return;
      const onFocus = () => {
        if (Number(gsap.getProperty(el, "opacity")) < 0.99) scrollToY(getY());
      };
      el.addEventListener("focusin", onFocus);
      cleanups.push(() => {
        el.removeEventListener("focusin", onFocus);
        el.style.pointerEvents = "";
      });
    };

    const ctx = gsap.context(() => {
      /* The day: ground colour and clock follow the section in view. */
      const time = { m: 7 * 60 };
      const goTo = (section: HTMLElement) => {
        const duration = reduced ? 0 : 1.4;
        gsap.to(document.documentElement, {
          "--ground": section.dataset.bg,
          duration,
          ease: "power2.out",
          overwrite: "auto",
        });
        gsap.to(time, {
          m: toMinutes(section.dataset.time ?? "07:00"),
          duration,
          ease: "power2.out",
          overwrite: "auto",
          onUpdate: () => {
            if (clock) clock.textContent = formatClock(time.m);
          },
        });
      };
      gsap.utils.toArray<HTMLElement>("section[data-time]").forEach((sec) => {
        ScrollTrigger.create({
          trigger: sec,
          start: "top 55%",
          end: "bottom 55%",
          onEnter: () => goTo(sec),
          onEnterBack: () => goTo(sec),
        });
      });

      /* Phone booking bar: after the hero, hidden over pricing and the close. */
      const showBar = (on: boolean) => bar?.classList.toggle("show", on);
      ScrollTrigger.create({
        trigger: "#how",
        start: "top 80%",
        endTrigger: "#pricing",
        end: "top 90%",
        onToggle: (self) => showBar(self.isActive),
      });
      ScrollTrigger.create({
        trigger: ".evening",
        start: "top 80%",
        endTrigger: ".close-cta",
        end: "top 90%",
        onToggle: (self) => showBar(self.isActive),
      });

      if (reduced) return;
      const scrub = 1;

      /* 07:00 hero: the frame opens to the whole screen, then pushes in. */
      gsap.from("#hero-copy > *", {
        y: 26,
        opacity: 0,
        duration: 1.2,
        ease: "power3.out",
        stagger: 0.09,
        delay: 0.1,
      });
      gsap.from("#hero-media", {
        opacity: 0,
        duration: 1.4,
        ease: "power2.out",
        delay: 0.35,
      });
      const heroCopy = root.querySelector<HTMLElement>("#hero-copy");
      gsap
        .timeline({
          defaults: { ease: "power2.inOut" },
          scrollTrigger: {
            trigger: ".hero",
            start: "top top",
            end: "bottom bottom",
            scrub,
          },
          onUpdate: () => syncHits(heroCopy),
        })
        .to("#hero-copy", { opacity: 0, y: -40, duration: 0.6 }, 0)
        .to(open, { p: 1, duration: 1.2, onUpdate: setClip }, 0.1)
        .to("#hero-scrim", { opacity: 1, duration: 0.6 }, 0.8)
        .fromTo(
          "#say-1",
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.5 },
          1.0,
        )
        .to("#hero-media img", { scale: 1.3, duration: 1.8 }, 1.3)
        .to("#say-1", { opacity: 0, y: -30, duration: 0.45 }, 1.8)
        .fromTo(
          "#say-2",
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.5 },
          2.15,
        )
        .to({}, { duration: 0.5 });
      revealOnFocus(heroCopy, () => 0);

      /* Framed photos open as they arrive. */
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((frame) => {
        gsap.fromTo(
          frame,
          { clipPath: "inset(9% 9% 9% 9% round 6px)" },
          {
            clipPath: "inset(0% 0% 0% 0% round 6px)",
            ease: "none",
            scrollTrigger: {
              trigger: frame,
              start: "top 95%",
              end: "top 40%",
              scrub: 0.8,
            },
          },
        );
        gsap.fromTo(
          frame.querySelector("img"),
          { scale: 1.16 },
          {
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: frame,
              start: "top 95%",
              end: "bottom 20%",
              scrub: 0.8,
            },
          },
        );
      });

      /* 13:00 workplaces: the frame opens to full screen. If scrolling comes
         to rest while the frame is still opening on the way down, the page
         glides on to the finished scene so it never sits half-open. Passing
         straight through (a link, the End key, find in page) never triggers
         it, and any wheel or touch input takes over mid-glide. */
      const settleBand = (direction: number) => {
        clearTimeout(bandRest);
        if (direction !== 1) return;
        bandRest = setTimeout(() => {
          const st = bandTl.scrollTrigger;
          if (!st || isGliding()) return;
          const done = 1.3 / bandTl.duration();
          if (st.progress > 0.01 && st.progress < done - 0.02) {
            scrollToY(bandFinished());
          }
        }, 160);
      };
      const bandCopy = root.querySelector<HTMLElement>("#band-copy");
      const bandTl = gsap
        .timeline({
          scrollTrigger: {
            trigger: ".band",
            start: "top top",
            end: "bottom bottom",
            scrub,
            onUpdate: (self) => settleBand(self.direction),
          },
          onUpdate: () => syncHits(bandCopy),
        })
        .to(
          bandOpen,
          {
            p: 1,
            duration: 1,
            ease: "power2.inOut",
            onUpdate: setBandClip,
          },
          0,
        )
        .to("#band-media img", { scale: 1, duration: 1.2, ease: "none" }, 0)
        .fromTo(
          "#band-copy",
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
          0.75,
        )
        .to({}, { duration: 0.4 });
      // Scroll position where the frame is open and the copy fully in.
      const bandFinished = () => {
        const st = bandTl.scrollTrigger;
        if (!st) return 0;
        return st.start + (st.end - st.start) * (1.3 / bandTl.duration());
      };
      cleanups.push(registerScrollTarget("workplaces", bandFinished));
      revealOnFocus(bandCopy, bandFinished);
      syncHits(bandCopy);

      /* 14:00 the checklist ticks draw in. */
      gsap.fromTo(
        "#checklist .tick path",
        { strokeDashoffset: 16 },
        {
          strokeDashoffset: 0,
          stagger: 0.12,
          duration: 0.5,
          ease: "power2.out",
          scrollTrigger: { trigger: "#checklist", start: "top 70%" },
        },
      );

      /* 18:30 the room turns to evening. The words arrive as the light
         turns, so the scene is never a photo without them for long. */
      const eveCopy = root.querySelector<HTMLElement>("#eve-copy");
      const eveTl = gsap
        .timeline({
          scrollTrigger: {
            trigger: ".evening",
            start: "top top",
            end: "bottom bottom",
            scrub,
          },
          onUpdate: () => syncHits(eveCopy),
        })
        .fromTo(
          ".evening .stage img",
          { scale: 1.08 },
          { scale: 1, duration: 1.4, ease: "none" },
          0,
        )
        .to(
          "#eve-late",
          { opacity: 1, duration: 0.9, ease: "power1.inOut" },
          0.2,
        )
        .fromTo(
          "#eve-copy",
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
          0.45,
        )
        .to({}, { duration: 0.3 });
      const eveFinished = () => {
        const st = eveTl.scrollTrigger;
        if (!st) return 0;
        return st.start + (st.end - st.start) * (0.95 / eveTl.duration());
      };
      revealOnFocus(eveCopy, eveFinished);
      syncHits(heroCopy, eveCopy);
    }, root);

    // Content that changes height (an opened FAQ answer, late fonts) moves
    // every scene below it, so re-measure once it settles.
    let lastHeight = root.offsetHeight;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const resizes = new ResizeObserver(() => {
      const height = root.offsetHeight;
      if (Math.abs(height - lastHeight) < 1) return;
      lastHeight = height;
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 150);
    });
    resizes.observe(root);

    // Arriving from another page with a hash: land once the scenes are measured.
    const landing = requestAnimationFrame(() => {
      if (window.location.hash) {
        scrollToHash(window.location.hash, { immediate: true });
      }
    });

    return () => {
      cancelAnimationFrame(landing);
      clearTimeout(bandRest);
      clearTimeout(refreshTimer);
      resizes.disconnect();
      cleanups.forEach((fn) => fn());
      ScrollTrigger.removeEventListener("refreshInit", measureBand);
      if (band) band.style.clipPath = "";
      ScrollTrigger.removeEventListener("refreshInit", measure);
      ctx.revert();
      bar?.classList.remove("show");
      if (media) media.style.clipPath = "";
    };
  }, [reducedPref]);

  return (
    <main id="main" ref={rootRef}>
      {children}
    </main>
  );
}
