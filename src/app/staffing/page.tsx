import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Check } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Card } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import { Placeholder } from "@/components/ui/Placeholder";
import { Reveal, Stagger, RevealItem } from "@/components/motion/Reveal";
import { PageHero } from "@/components/sections/PageHero";
import { SectionHead } from "@/components/sections/SectionHead";
import { CTASection } from "@/components/sections/CTASection";

export const metadata: Metadata = {
  title: "Staffing & Recruiting in Austin, TX",
  description:
    "Clerical, administrative, and light industrial talent on temporary, temp-to-hire, and direct-hire terms — screened and reference-checked.",
};

const FEATURES = [
  {
    title: "A shortlist, not a dump",
    body: "Senior recruiters screen before submittal. You review a handful of people we'd stake our name on.",
  },
  {
    title: "Real pre-screening",
    body: "Every candidate is interviewed in person or on video and reference-checked before you see them.",
  },
  {
    title: "Salary up front",
    body: "Each candidate comes with stated pay expectations, so there are no surprises late in the process.",
  },
  {
    title: "Flexible terms",
    body: "Temporary, temp-to-hire, or direct-hire — structured the way the role actually needs.",
  },
  {
    title: "A named contact",
    body: "One person stays accountable after the start date — not a rotating cast of account reps.",
  },
];

export default function StaffingPage() {
  return (
    <>
      <PageHero
        eyebrow="Staffing & Recruiting"
        title="The right two or three, not a stack of fifty."
        sub="Clerical, administrative, and light industrial talent on temporary, temp-to-hire, and direct-hire terms. Screened, reference-checked, and ready to work."
        actions={
          <Link href="/contact" className={buttonVariants({ size: "lg" })}>
            Request Talent
          </Link>
        }
      />

      <Section>
        <Container className="grid items-start gap-[clamp(32px,6vw,80px)] md:grid-cols-2">
          <Stagger>
            <RevealItem>
              <Eyebrow className="mb-6">What it is</Eyebrow>
            </RevealItem>
            <RevealItem>
              <h2 className="text-h2">Hiring help that does the filtering for you.</h2>
            </RevealItem>
            <RevealItem>
              <p className="mt-4 text-body-lg text-muted">
                You tell us the role and what &ldquo;the right fit&rdquo; means.
                We source, screen, and reference-check, then hand you a focused
                slate with salary expectations stated up front.
              </p>
            </RevealItem>
          </Stagger>
          <Stagger>
            <RevealItem>
              <Eyebrow className="mb-6">Who it&apos;s for</Eyebrow>
            </RevealItem>
            <RevealItem>
              <p className="text-muted">
                Austin and Central Texas businesses that need to fill clerical,
                administrative, or light industrial roles without drowning in
                applicants — whether that&apos;s covering a busy season, trialing
                someone before a permanent offer, or hiring direct.
              </p>
            </RevealItem>
          </Stagger>
        </Container>
      </Section>

      <Section tight>
        <Container>
          <SectionHead
            eyebrow="What you get"
            title="Built to do the opposite of a resume dump."
          />
          <Stagger className="mt-[clamp(40px,5vw,64px)] flex flex-col gap-6">
            {FEATURES.map((f) => (
              <RevealItem key={f.title} className="flex gap-4">
                <span className="mt-0.5 grid size-[26px] flex-none place-items-center rounded-full bg-accent-soft text-accent">
                  <Check className="size-3.5" aria-hidden="true" />
                </span>
                <div>
                  <h4 className="font-body text-body-lg font-[560]">{f.title}</h4>
                  <p className="mt-1 text-sm text-muted">{f.body}</p>
                </div>
              </RevealItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      <Section>
        <Container>
          <Reveal>
            <Card className="max-w-[68ch]">
              <span className="grid size-11 place-items-center rounded-[11px] border border-hairline bg-accent-soft text-accent">
                <ShieldCheck className="size-[22px]" strokeWidth={1.6} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-h3 font-[540] tracking-[-0.02em]">
                A real guarantee, in writing.
              </h3>
              <p className="mt-3 text-muted">
                If a direct-hire placement doesn&apos;t work out within{" "}
                <Placeholder>90</Placeholder> days, we replace them at no
                additional fee. We respond to every talent request within{" "}
                <Placeholder>one business day</Placeholder>.
              </p>
            </Card>
          </Reveal>
        </Container>
      </Section>

      <CTASection
        title="Tell us the role. We'll start sourcing."
        sub={
          <>
            Send the role, the timeline, and your location. You&apos;ll hear back
            within <Placeholder>one business day</Placeholder>.
          </>
        }
      >
        <Link href="/contact" className={buttonVariants({ size: "lg" })}>
          Request Talent
        </Link>
      </CTASection>
    </>
  );
}
