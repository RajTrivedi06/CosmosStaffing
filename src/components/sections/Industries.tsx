"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Container } from "@/components/ui/Container";
import { SectionHead } from "./SectionHead";
import { Reveal } from "@/components/motion/Reveal";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";
import { useMediaQuery } from "@/lib/hooks";
import { siteConfig } from "@/lib/site";

const ROLES = [
  "Program & project management",
  "Systems & network infrastructure",
  "Engineering",
  "Software, mobile & e-commerce",
  "Finance & accounting",
  "Healthcare & medical",
  "Administrative & clerical",
  "Light industrial & warehouse",
];

function RoleCard({ index, title }: { index: number; title: string }) {
  return (
    <div className="flex min-h-[200px] w-[clamp(220px,24vw,300px)] flex-none flex-col justify-between rounded-card border border-hairline bg-surface p-[clamp(22px,3vw,34px)] max-[820px]:snap-start">
      <span className="font-mono text-sm text-accent">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="text-h3 font-[520] tracking-[-0.02em]">{title}</span>
    </div>
  );
}

export function Industries() {
  const reduced = useReducedMotionSafe();
  const isDesktop = useMediaQuery("(min-width: 821px)");
  const [distance, setDistance] = useState(0);

  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const interactive = isDesktop && !reduced;

  // Measure how far the track overflows the viewport via ResizeObserver
  // (its async callback avoids synchronous setState in the effect body).
  useEffect(() => {
    if (!interactive) return;
    const track = trackRef.current;
    const sticky = stickyRef.current;
    if (!track || !sticky) return;
    const ro = new ResizeObserver(() => {
      setDistance(Math.max(0, track.scrollWidth - sticky.clientWidth));
    });
    ro.observe(track);
    ro.observe(sticky);
    return () => ro.disconnect();
  }, [interactive]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);

  const area = siteConfig.serviceArea;
  const serviceArea = `Serving ${area.slice(0, -1).join(", ")}, and ${area.at(-1)}.`;

  return (
    <section ref={sectionRef} className="py-[clamp(64px,10vw,128px)]">
      <Container>
        <SectionHead
          eyebrow="Roles & industries"
          title="Roles we place across Central Texas."
        />
      </Container>

      {interactive ? (
        <div
          className="relative mt-[clamp(32px,4vw,56px)]"
          style={{ height: `calc(100vh + ${distance}px)` }}
        >
          <div
            ref={stickyRef}
            className="sticky top-0 flex h-screen items-center overflow-hidden px-(--gutter)"
          >
            <motion.div ref={trackRef} style={{ x }} className="flex gap-4">
              {ROLES.map((title, i) => (
                <RoleCard key={title} index={i} title={title} />
              ))}
            </motion.div>
          </div>
        </div>
      ) : (
        <div className="mt-[clamp(32px,4vw,56px)] flex snap-x snap-mandatory gap-4 overflow-x-auto px-(--gutter) py-2 [scrollbar-width:none]">
          {ROLES.map((title, i) => (
            <RoleCard key={title} index={i} title={title} />
          ))}
        </div>
      )}

      <Container>
        <Reveal>
          <p className="mt-8 max-w-[60ch] text-muted">{serviceArea}</p>
        </Reveal>
      </Container>
    </section>
  );
}
