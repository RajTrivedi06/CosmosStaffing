import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { buttonVariants } from "@/components/ui/Button";
import { Placeholder } from "@/components/ui/Placeholder";
import { Reveal, Stagger, RevealItem } from "@/components/motion/Reveal";
import { Parallax } from "@/components/motion/Parallax";
import { Magnetic } from "@/components/motion/Magnetic";
import { HeroHeadline } from "./HeroHeadline";

const TRUST = [
  "Austin-based",
  "Senior recruiters",
  "Every candidate pre-screened",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-[clamp(140px,20vh,220px)] pb-[clamp(72px,12vw,140px)]">
      <div
        className="pointer-events-none absolute inset-x-[-10%] top-[-10%] bottom-0 z-0"
        aria-hidden="true"
      >
        <Parallax speed={0.06} className="absolute top-[-18%] right-[-8%]">
          <div className="hero-glow" />
        </Parallax>
        <Parallax speed={0.12} className="absolute bottom-[-22%] left-[-6%]">
          <div className="hero-shape" />
        </Parallax>
      </div>

      <Container className="relative z-1">
        <Parallax speed={0.03}>
          <Reveal>
            <Eyebrow className="mb-6">Austin · Central Texas Staffing</Eyebrow>
          </Reveal>

          <HeroHeadline />

          <Stagger className="mt-8">
            <RevealItem>
              <p className="max-w-[56ch] text-body-lg leading-[1.62] text-muted">
                Cosmos Staffing places vetted clerical, professional, and
                technical talent with Central Texas businesses, and handles the
                HR, payroll, and bookkeeping behind them. Senior recruiters
                screen every candidate before they reach you, so your shortlist
                is short for a reason.
              </p>
            </RevealItem>
            <RevealItem className="mt-8 flex flex-wrap gap-4">
              <Magnetic>
                <Link
                  href="/contact"
                  className={buttonVariants({ size: "lg" })}
                >
                  Request Talent
                </Link>
              </Magnetic>
              <Link
                href="/jobs"
                className={buttonVariants({ variant: "ghost", size: "lg" })}
              >
                Find a Job
              </Link>
            </RevealItem>
          </Stagger>
        </Parallax>

        <Reveal>
          <div className="mt-[clamp(40px,6vw,72px)] flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted">
            {TRUST.map((item, i) => (
              <span key={item} className="inline-flex items-center gap-3">
                {i > 0 && (
                  <span className="size-1 rounded-full bg-accent/50" aria-hidden="true" />
                )}
                {item}
              </span>
            ))}
            <span className="inline-flex items-center gap-3">
              <span className="size-1 rounded-full bg-accent/50" aria-hidden="true" />
              <span>
                Backed by a family group with <Placeholder>30+</Placeholder>{" "}
                years in workforce services
              </span>
            </span>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
