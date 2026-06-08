import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { buttonVariants } from "@/components/ui/Button";
import { Placeholder } from "@/components/ui/Placeholder";
import { Stagger, RevealItem } from "@/components/motion/Reveal";
import { PageHero } from "@/components/sections/PageHero";
import { SectionHead } from "@/components/sections/SectionHead";
import { BeliefGrid } from "@/components/sections/BeliefGrid";
import { CTASection } from "@/components/sections/CTASection";

export const metadata: Metadata = {
  title: "Bookkeeping in Austin, TX",
  description:
    "Back-office bookkeeping for small and mid-sized Austin businesses — kept current and clean.",
};

const SCOPE = [
  {
    title: "Kept current",
    body: "Transactions recorded and categorized on a regular cadence — not in one annual rush.",
  },
  {
    title: "Reconciled",
    body: (
      <>
        Accounts reconciled so the books match reality.{" "}
        <Placeholder>cadence</Placeholder>
      </>
    ),
  },
  {
    title: "Reported",
    body: (
      <>
        Clear statements when you need them.{" "}
        <Placeholder>reporting detail</Placeholder>
      </>
    ),
  },
];

export default function BookkeepingPage() {
  return (
    <>
      <PageHero
        eyebrow="Bookkeeping"
        title="Clean books, kept current."
        sub="Back-office bookkeeping for small and mid-sized Austin businesses — so your numbers are ready when you need them, not scrambled together at quarter's end."
        actions={
          <Link href="/contact" className={buttonVariants({ size: "lg" })}>
            Get a Quote
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
              <h2 className="text-h2">
                The same accountability, applied to your books.
              </h2>
            </RevealItem>
            <RevealItem>
              <p className="mt-4 text-body-lg text-muted">
                Cosmos keeps the back office running for the businesses we work
                with. Bookkeeping is part of that: current records, clean
                categories, and a real person who knows your account.
              </p>
            </RevealItem>
          </Stagger>
          <Stagger>
            <RevealItem>
              <Eyebrow className="mb-6">Who it&apos;s for</Eyebrow>
            </RevealItem>
            <RevealItem>
              <p className="text-muted">
                Small and mid-sized Central Texas businesses that would rather
                hand the books to someone reliable than chase them after hours.
              </p>
            </RevealItem>
          </Stagger>
        </Container>
      </Section>

      <Section tight>
        <Container>
          <SectionHead
            eyebrow="Scope"
            title="What's included."
            lead={
              <>
                Final scope is set with you. A typical engagement covers:{" "}
                <Placeholder>scope</Placeholder>
              </>
            }
          />
          <BeliefGrid items={SCOPE} />
        </Container>
      </Section>

      <CTASection
        title="Ready to hand off the books?"
        sub={
          <>
            Tell us a little about your business and we&apos;ll scope it with
            you. Reply within <Placeholder>one business day</Placeholder>.
          </>
        }
      >
        <Link href="/contact" className={buttonVariants({ size: "lg" })}>
          Get a Quote
        </Link>
      </CTASection>
    </>
  );
}
