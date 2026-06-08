import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Card } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import { Placeholder } from "@/components/ui/Placeholder";
import { Reveal, Stagger, RevealItem } from "@/components/motion/Reveal";
import { PageHero } from "@/components/sections/PageHero";
import { SectionHead } from "@/components/sections/SectionHead";
import { BeliefGrid } from "@/components/sections/BeliefGrid";
import { CTASection } from "@/components/sections/CTASection";

export const metadata: Metadata = {
  title: "About",
  description:
    "A local Austin staffing firm with deep workforce roots — recruiting, HR, payroll, and bookkeeping under one roof.",
};

const BELIEFS = [
  {
    title: "Screen before we submit.",
    body: "You see a shortlist, never a stack. Every candidate is interviewed and reference-checked first.",
  },
  {
    title: "Say what it costs.",
    body: "We explain bill rates and placement fees before you commit. No hidden markups, no surprises.",
  },
  {
    title: "Stay on it after the start date.",
    body: "A named contact follows through once someone starts. We keep vetted people ready to redeploy.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About Cosmos"
        title="A local staffing firm with deep roots."
        sub="We place vetted people and run the back office behind them — recruiting, HR, payroll, and bookkeeping under one roof, for Central Texas businesses."
      />

      <Section>
        <Container className="grid items-start gap-[clamp(32px,6vw,80px)] md:grid-cols-2">
          <Stagger>
            <RevealItem>
              <Eyebrow className="mb-6">The story</Eyebrow>
            </RevealItem>
            <RevealItem>
              <h2 className="text-h2">Workforce and the work behind it.</h2>
            </RevealItem>
          </Stagger>
          <Stagger className="flex flex-col gap-6 text-muted">
            <RevealItem>
              <p>
                Most companies that need to hire end up managing a recruiter, a
                payroll service, and a bookkeeper who never speak to each other.
                Cosmos was built to be the single number you call for all of it:
                find the right people, employ them correctly, and keep the books
                clean.
              </p>
            </RevealItem>
            <RevealItem>
              <p>
                Our recruiters live and work in Central Texas. They know the
                roles, the pay, and the difference between a resume that looks
                right and a person who is right. That local knowledge is the
                whole point.
              </p>
            </RevealItem>
            <RevealItem>
              <p>
                Cosmos Staffing is the operating name for Cosmos Services LLC,
                based in <Placeholder>Pflugerville</Placeholder>, Texas.
              </p>
            </RevealItem>
          </Stagger>
        </Container>
      </Section>

      <Section tight>
        <Container>
          <Reveal>
            <Card>
              <Eyebrow className="mb-6">Heritage</Eyebrow>
              <p className="max-w-[48ch] font-display text-h3 leading-[1.3] font-[520] tracking-[-0.02em]">
                Cosmos is part of a family group with{" "}
                <Placeholder>30+</Placeholder> years in workforce services and{" "}
                <Placeholder>200,000+</Placeholder> placements.
              </p>
              <p className="mt-6 max-w-[60ch] text-muted">
                That heritage is the experience we draw on — not a claim about
                decades in Austin. <Placeholder>heritage detail</Placeholder>
              </p>
            </Card>
          </Reveal>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHead
            eyebrow="What we believe"
            title="Three rules we don't break."
          />
          <BeliefGrid items={BELIEFS} />
        </Container>
      </Section>

      <CTASection
        title="Let's talk about your team."
        sub={
          <>
            Tell us what you need and where you&apos;re located. You&apos;ll hear
            back within <Placeholder>one business day</Placeholder>.
          </>
        }
      >
        <Link href="/contact" className={buttonVariants({ size: "lg" })}>
          Request Talent
        </Link>
        <Link
          href="/jobs"
          className={buttonVariants({ variant: "ghost", size: "lg" })}
        >
          For Job Seekers
        </Link>
      </CTASection>
    </>
  );
}
