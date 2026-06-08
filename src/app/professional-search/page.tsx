import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Card } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import { Placeholder } from "@/components/ui/Placeholder";
import { Stagger, RevealItem } from "@/components/motion/Reveal";
import { PageHero } from "@/components/sections/PageHero";
import { SectionHead } from "@/components/sections/SectionHead";
import { CTASection } from "@/components/sections/CTASection";

export const metadata: Metadata = {
  title: "Professional Search in Austin, TX",
  description:
    "Specialized and technical search — engineering, IT, finance, and program management — sourced by recruiters who understand the function.",
};

const FUNCTIONS = [
  {
    title: "Engineering",
    body: "Mechanical, electrical, civil, and process engineering roles.",
  },
  {
    title: "IT & Infrastructure",
    body: "Systems, network, and infrastructure positions.",
  },
  {
    title: "Software",
    body: "Software, mobile, and e-commerce development.",
  },
  {
    title: "Finance",
    body: "Finance, accounting, and analyst roles.",
  },
  {
    title: "Program & Project Management",
    body: "Program and project leadership across technical organizations.",
  },
];

export default function ProfessionalSearchPage() {
  return (
    <>
      <PageHero
        eyebrow="Professional Search"
        title="Specialized roles, sourced by people who get the work."
        sub="Engineering, IT, finance, program management, and other technical roles — recruited by people who understand the function, not just the keywords."
        actions={
          <Link href="/contact" className={buttonVariants({ size: "lg" })}>
            Start a Search
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
              <h2 className="text-h2">Search for roles where the details matter.</h2>
            </RevealItem>
            <RevealItem>
              <p className="mt-4 text-body-lg text-muted">
                Some roles can&apos;t be filled from a keyword match. We recruit
                for specialized and technical positions where a recruiter has to
                understand what the work actually involves to tell a strong
                candidate from a plausible one.
              </p>
            </RevealItem>
          </Stagger>
          <Stagger>
            <RevealItem>
              <Eyebrow className="mb-6">The rigor</Eyebrow>
            </RevealItem>
            <RevealItem>
              <p className="text-muted">
                Same screening discipline as the rest of Cosmos: every candidate
                interviewed and reference-checked, salary expectations stated up
                front, and a focused slate instead of a flood. We work to present
                a diverse slate on every search.
              </p>
            </RevealItem>
          </Stagger>
        </Container>
      </Section>

      <Section tight>
        <Container>
          <SectionHead
            eyebrow="Functions we recruit"
            title="Where Professional Search goes deep."
          />
          <Stagger className="mt-[clamp(40px,5vw,64px)] grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FUNCTIONS.map((f) => (
              <RevealItem key={f.title}>
                <Card lift className="h-full">
                  <h3 className="text-h3 font-[540] tracking-[-0.02em]">
                    {f.title}
                  </h3>
                  <p className="mt-3 text-sm text-muted">{f.body}</p>
                </Card>
              </RevealItem>
            ))}
            <RevealItem>
              <Card lift className="h-full">
                <h3 className="text-h3 font-[540] tracking-[-0.02em]">
                  And more
                </h3>
                <p className="mt-3 text-sm text-muted">
                  Other specialized functions across Central Texas.{" "}
                  <Placeholder>additional specialties</Placeholder>
                </p>
              </Card>
            </RevealItem>
          </Stagger>
        </Container>
      </Section>

      <CTASection
        title="Have a specialized role to fill?"
        sub={
          <>
            Tell us the function and the must-haves. You&apos;ll hear back within{" "}
            <Placeholder>one business day</Placeholder>.
          </>
        }
      >
        <Link href="/contact" className={buttonVariants({ size: "lg" })}>
          Start a Search
        </Link>
      </CTASection>
    </>
  );
}
