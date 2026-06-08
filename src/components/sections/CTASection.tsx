import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Parallax } from "@/components/motion/Parallax";
import { Stagger, RevealItem } from "@/components/motion/Reveal";

type CTASectionProps = {
  title: React.ReactNode;
  sub: React.ReactNode;
  /** One or more CTAs (e.g. a primary Button/Link). */
  children: React.ReactNode;
};

/** Centered closing call-to-action with the ambient accent glow. Shared by the
 *  homepage and every inner page so the final ask is consistent everywhere. */
export function CTASection({ title, sub, children }: CTASectionProps) {
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
        <Stagger className="mx-auto max-w-[28ch]">
          <RevealItem>
            <h2 className="text-h1">{title}</h2>
          </RevealItem>
          <RevealItem>
            <p className="mx-auto mt-6 max-w-[46ch] text-body-lg text-muted">
              {sub}
            </p>
          </RevealItem>
          <RevealItem className="mt-8 flex flex-wrap justify-center gap-4">
            {children}
          </RevealItem>
        </Stagger>
      </Container>
    </Section>
  );
}
