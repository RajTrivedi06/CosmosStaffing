import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Stagger, RevealItem } from "@/components/motion/Reveal";

type PageHeroProps = {
  eyebrow: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
};

/** Shared inner-page hero: eyebrow + H1 + optional sub + optional CTAs. */
export function PageHero({ eyebrow, title, sub, actions }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-hairline pt-[clamp(140px,20vh,200px)] pb-[clamp(48px,7vw,80px)]">
      <Container>
        <Stagger>
          <RevealItem>
            <Eyebrow className="mb-6">{eyebrow}</Eyebrow>
          </RevealItem>
          <RevealItem>
            <h1 className="max-w-[18ch] text-h1 tracking-[-0.03em]">{title}</h1>
          </RevealItem>
          {sub && (
            <RevealItem>
              <p className="mt-6 max-w-[60ch] text-body-lg text-muted">{sub}</p>
            </RevealItem>
          )}
          {actions && (
            <RevealItem className="mt-8 flex flex-wrap gap-4">{actions}</RevealItem>
          )}
        </Stagger>
      </Container>
    </section>
  );
}
