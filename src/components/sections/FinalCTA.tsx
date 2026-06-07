import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { buttonVariants } from "@/components/ui/Button";
import { Placeholder } from "@/components/ui/Placeholder";
import { Parallax } from "@/components/motion/Parallax";
import { Magnetic } from "@/components/motion/Magnetic";
import { Stagger, RevealItem } from "@/components/motion/Reveal";

export function FinalCTA() {
  return (
    <Section className="overflow-hidden text-center">
      <Parallax
        speed={0.05}
        aria-hidden
        className="pointer-events-none absolute top-[-20%] left-1/2 -translate-x-1/2"
      >
        <div className="hero-glow" style={{ opacity: 0.3 }} />
      </Parallax>

      <Container className="relative z-1">
        <Stagger className="mx-auto max-w-[24ch]">
          <RevealItem>
            <h2 className="text-h1">Tell us what you need. We&apos;ll get to work.</h2>
          </RevealItem>
          <RevealItem>
            <p className="mx-auto mt-6 text-body-lg text-muted">
              Send us the role, the timeline, and where you&apos;re located.
              You&apos;ll hear back within{" "}
              <Placeholder>one business day</Placeholder>.
            </p>
          </RevealItem>
          <RevealItem className="mt-8 flex flex-wrap justify-center gap-4">
            <Magnetic>
              <Link href="/contact" className={buttonVariants({ size: "lg" })}>
                Request Talent
              </Link>
            </Magnetic>
            <a
              href="tel:000"
              className={buttonVariants({ variant: "ghost", size: "lg" })}
            >
              Call <Placeholder>phone</Placeholder>
            </a>
          </RevealItem>
        </Stagger>
      </Container>
    </Section>
  );
}
