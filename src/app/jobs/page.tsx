import type { Metadata } from "next";
import { Wallet, PhoneCall, Target } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { buttonVariants } from "@/components/ui/Button";
import { Placeholder } from "@/components/ui/Placeholder";
import { Stagger, RevealItem } from "@/components/motion/Reveal";
import { PageHero } from "@/components/sections/PageHero";
import { SectionHead } from "@/components/sections/SectionHead";
import { FAQ } from "@/components/sections/FAQ";
import { CTASection } from "@/components/sections/CTASection";

export const metadata: Metadata = {
  title: "For Job Seekers",
  description:
    "Real pay and hours up front, a recruiter who calls back, and roles that match what you can do.",
};

const TRAITS = [
  {
    Icon: Wallet,
    title: "Pay and hours up front",
    body: 'You’ll know the rate and the schedule before you say yes. No vague "competitive pay."',
  },
  {
    Icon: PhoneCall,
    title: "A recruiter who calls back",
    body: "You get a real person — one who follows up, not one who ghosts after the intake call.",
  },
  {
    Icon: Target,
    title: "Roles that fit",
    body: "We match you to work you can actually do well — not whatever happens to be open today.",
  },
];

const FAQS = [
  {
    q: "Does it cost me anything?",
    a: "No. Working with Cosmos is free for job seekers. We're paid by the businesses that hire — never by you.",
  },
  {
    q: "What's the difference between temp, temp-to-hire, and direct-hire?",
    a: "Temp is a defined assignment with an end in sight. Temp-to-hire is a trial period that can convert to a permanent role — and we'll tell you what it takes to convert. Direct-hire means you're hired onto the company's payroll from day one.",
  },
  {
    q: "How and when do I get paid?",
    a: (
      <>
        For roles where Cosmos employs you, you&apos;re a W-2 employee and we run
        payroll on a <Placeholder>pay schedule</Placeholder> schedule. We&apos;ll
        confirm the specifics before you start.
      </>
    ),
  },
  {
    q: "What kinds of roles do you place?",
    a: "Everything from administrative and clerical to light industrial, plus specialized and technical roles in engineering, IT, finance, and program management across Central Texas.",
  },
];

export default function JobSeekersPage() {
  return (
    <>
      <PageHero
        eyebrow="For job seekers"
        title="We'll be straight with you."
        sub="Real pay and hours up front. A recruiter who actually calls back. Roles that match what you can do, not whatever's open. If a job's temp-to-hire, we'll tell you what it takes to convert."
        actions={
          <>
            <a href="#" className={buttonVariants({ size: "lg" })}>
              See Open Jobs
            </a>
            <a
              href="#"
              className={buttonVariants({ variant: "ghost", size: "lg" })}
            >
              Submit Your Resume
            </a>
          </>
        }
      />

      <Section>
        <Container>
          <SectionHead
            eyebrow="What working with us is like"
            title="No runaround. Just the real picture."
          />
          <Stagger className="mt-[clamp(40px,5vw,64px)] grid gap-8 md:grid-cols-3">
            {TRAITS.map(({ Icon, title, body }) => (
              <RevealItem key={title} className="flex flex-col gap-4">
                <span className="grid size-11 place-items-center rounded-[11px] border border-hairline bg-accent-soft text-accent">
                  <Icon className="size-[22px]" strokeWidth={1.6} aria-hidden="true" />
                </span>
                <h3 className="text-h3 font-[540] tracking-[-0.02em]">{title}</h3>
                <p className="text-muted">{body}</p>
              </RevealItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      <Section tight tinted>
        <Container>
          <SectionHead
            className="mb-[clamp(24px,4vw,40px)]"
            eyebrow="Good to know"
            title="Questions, answered straight."
          />
          <FAQ items={FAQS} />
        </Container>
      </Section>

      <CTASection
        title="Let's find you the right job."
        sub="Browse what's open or send your resume — a recruiter will actually get back to you."
      >
        <a href="#" className={buttonVariants({ size: "lg" })}>
          See Open Jobs
        </a>
        <a
          href="#"
          className={buttonVariants({ variant: "ghost", size: "lg" })}
        >
          Submit Your Resume
        </a>
      </CTASection>
    </>
  );
}
