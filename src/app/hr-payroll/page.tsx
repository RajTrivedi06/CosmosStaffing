import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { buttonVariants } from "@/components/ui/Button";
import { Placeholder } from "@/components/ui/Placeholder";
import { Reveal, Stagger, RevealItem } from "@/components/motion/Reveal";
import { PageHero } from "@/components/sections/PageHero";
import { SectionHead } from "@/components/sections/SectionHead";
import { CTASection } from "@/components/sections/CTASection";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "HR & Payroll in Austin, TX",
  description:
    "W-2 employment, payroll, and HR administration for the people we place — so the paperwork isn't your problem.",
};

const HANDLES = [
  "W-2 employment for placed workers",
  "Payroll processing and pay schedules",
  "Onboarding and new-hire paperwork",
  "Day-to-day HR administration for those workers",
  "A named contact for payroll questions",
];

function HandleColumn({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className={cn("mb-6 text-h3", accent && "text-accent")}>{title}</h3>
      <ul className="flex flex-col gap-3">{children}</ul>
    </div>
  );
}

function HandleItem({
  children,
  muted,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <li className="flex gap-3 text-muted">
      <span
        className={cn(
          "mt-2.5 size-2 flex-none rounded-full",
          muted ? "bg-hairline" : "bg-accent",
        )}
        aria-hidden="true"
      />
      <span>{children}</span>
    </li>
  );
}

export default function HrPayrollPage() {
  return (
    <>
      <PageHero
        eyebrow="HR & Payroll"
        title="We employ the people we place. So the paperwork isn't yours."
        sub="W-2 employment, payroll, and HR administration for the workers Cosmos places with you — handled in plain language, kept current."
        actions={
          <Link href="/contact" className={buttonVariants({ size: "lg" })}>
            Talk to Us
          </Link>
        }
      />

      <Section>
        <Container>
          <SectionHead
            eyebrow="The simple version"
            title="What we handle, and what stays with you."
            lead="For the people we place, Cosmos carries the employment administration. Here's the honest split — no jargon, no over-claiming."
          />
          <Reveal className="mt-[clamp(40px,5vw,64px)] grid gap-x-8 gap-y-10 md:grid-cols-2">
            <HandleColumn title="Cosmos handles" accent>
              {HANDLES.map((h) => (
                <HandleItem key={h}>{h}</HandleItem>
              ))}
            </HandleColumn>
            <HandleColumn title="Stays with you">
              <HandleItem muted>Day-to-day direction of the work</HandleItem>
              <HandleItem muted>Your own internal team and policies</HandleItem>
              <HandleItem muted>Decisions about who to keep and convert</HandleItem>
              <HandleItem muted>Your worksite and operations</HandleItem>
              <HandleItem muted>
                <Placeholder>anything specific to your setup</Placeholder>
              </HandleItem>
            </HandleColumn>
          </Reveal>
          <Reveal>
            <p className="mt-10 max-w-[70ch] text-sm text-muted">
              Cosmos provides employment administration for the people we place.
              We don&apos;t position this as eliminating co-employment risk or
              acting as an employer of record — talk to us and your own advisors
              about what fits your situation.
            </p>
          </Reveal>
        </Container>
      </Section>

      <Section tight>
        <Container className="grid items-start gap-[clamp(32px,6vw,80px)] md:grid-cols-2">
          <Stagger>
            <RevealItem>
              <Eyebrow className="mb-6">Why it helps</Eyebrow>
            </RevealItem>
            <RevealItem>
              <h2 className="text-h2">One less back office to run.</h2>
            </RevealItem>
          </Stagger>
          <Stagger className="flex flex-col gap-6 text-muted">
            <RevealItem>
              <p>
                When the recruiter who found your people is also the one running
                their payroll, things don&apos;t fall between the cracks. A
                missed timesheet, a pay question, an onboarding form — it&apos;s
                one number to call.
              </p>
            </RevealItem>
            <RevealItem>
              <p>
                That&apos;s the point of doing staffing and HR together: fewer
                handoffs, fewer surprises, and someone accountable when something
                needs fixing.
              </p>
            </RevealItem>
          </Stagger>
        </Container>
      </Section>

      <CTASection
        title="Want the paperwork off your plate?"
        sub={
          <>
            Tell us about your team and we&apos;ll walk you through how it works.
            Reply within <Placeholder>one business day</Placeholder>.
          </>
        }
      >
        <Link href="/contact" className={buttonVariants({ size: "lg" })}>
          Talk to Us
        </Link>
      </CTASection>
    </>
  );
}
