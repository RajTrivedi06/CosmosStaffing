import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { buttonVariants } from "@/components/ui/Button";
import { Reveal, Stagger, RevealItem } from "@/components/motion/Reveal";

export function CandidateBand() {
  return (
    <Section tinted>
      <Container className="grid items-center gap-[clamp(32px,6vw,80px)] md:grid-cols-[1fr_0.8fr]">
        <Stagger>
          <RevealItem>
            <Eyebrow className="mb-6">For job seekers</Eyebrow>
          </RevealItem>
          <RevealItem>
            <h2 className="text-h1">
              Looking for work? We&apos;ll be straight with you.
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="mt-6 max-w-[60ch] text-body-lg leading-relaxed text-muted">
              Real pay and hours up front. A recruiter who actually calls back.
              Roles that match what you can do, not whatever&apos;s open. If a
              job&apos;s temp-to-hire, we&apos;ll tell you what it takes to
              convert.
            </p>
          </RevealItem>
          <RevealItem className="mt-8">
            <Link href="/jobs" className={buttonVariants({ size: "lg" })}>
              See Open Jobs
            </Link>
          </RevealItem>
        </Stagger>

        <Reveal className="img-ph min-h-[300px]">
          <span>placeholder · candidate imagery</span>
        </Reveal>
      </Container>
    </Section>
  );
}
