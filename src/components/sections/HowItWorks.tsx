"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHead } from "./SectionHead";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";
import { useMediaQuery } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    n: "Step 01",
    title: "Intake.",
    body: 'We learn the role, the team, and what "the right fit" means before we source anyone.',
  },
  {
    n: "Step 02",
    title: "Pre-screening.",
    body: "Every candidate is interviewed in person or on video and reference-checked. You only see people we'd stake our name on.",
  },
  {
    n: "Step 03",
    title: "Shortlist.",
    body: "You get a focused slate, not a flood, with salary expectations stated up front.",
  },
  {
    n: "Step 04",
    title: "Onboarding.",
    body: "We handle orientation and the W-2 paperwork.",
  },
  {
    n: "Step 05",
    title: "Follow-through.",
    body: "A named contact stays on it after the start date, and we keep vetted people ready to redeploy.",
  },
];

const SCENES = [
  { num: "01", label: "Intake" },
  { num: "02", label: "Pre-screening" },
  { num: "03", label: "Shortlist" },
  { num: "04", label: "Onboarding" },
  { num: "05", label: "Follow-through" },
];

export function HowItWorks() {
  const reduced = useReducedMotionSafe();
  const isDesktop = useMediaQuery("(min-width: 821px)");
  const [active, setActive] = useState(0);

  const stepsRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const interactive = isDesktop && !reduced;

  useEffect(() => {
    if (!interactive || !stepsRef.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const stepEls = Array.from(
        stepsRef.current!.querySelectorAll<HTMLElement>(".step"),
      );
      stepEls.forEach((el, i) => {
        ScrollTrigger.create({
          trigger: el,
          start: "top center",
          end: "bottom center",
          onToggle: (self) => self.isActive && setActive(i),
        });
      });
      ScrollTrigger.create({
        trigger: stepsRef.current!,
        start: "top center",
        end: "bottom center",
        scrub: true,
        onUpdate: (self) => {
          if (progressRef.current) {
            progressRef.current.style.height = `${self.progress * 100}%`;
          }
        },
      });
    });

    return () => ctx.revert();
  }, [interactive]);

  return (
    <Section>
      <Container>
        <SectionHead
          className="mb-[clamp(32px,5vw,56px)]"
          eyebrow="How it works"
          title="How a Cosmos placement actually goes."
        />

        <div className="grid items-start gap-[clamp(32px,6vw,88px)] min-[821px]:grid-cols-[0.95fr_1.05fr]">
          <div className="scrolly-visual max-[820px]:hidden" aria-hidden="true">
            {SCENES.map((scene, i) => (
              <div
                key={scene.num}
                className={cn("scene", active === i && "is-active")}
              >
                <div className="scene-bg" />
                <div className="max-w-[30ch] text-center">
                  <div className="scene-num">{scene.num}</div>
                  <div className="mt-4 text-h3 font-[540]">{scene.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="steps" ref={stepsRef}>
            <div className="steps-progress" ref={progressRef} aria-hidden="true" />
            {STEPS.map((step, i) => {
              const on = interactive ? active === i : true;
              return (
                <div
                  key={step.n}
                  className={cn(
                    "step relative py-[clamp(26px,4vw,40px)] pl-12 max-[820px]:pl-8",
                    on && "is-active",
                  )}
                >
                  <span className="step-dot" aria-hidden="true" />
                  <div className="font-mono text-sm text-muted">{step.n}</div>
                  <h3
                    className={cn(
                      "mt-1.5 text-h3 font-[540] tracking-[-0.02em] transition-colors duration-400",
                      interactive && active !== i ? "text-muted" : "text-ink",
                    )}
                  >
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-[46ch] text-muted">{step.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </Section>
  );
}
