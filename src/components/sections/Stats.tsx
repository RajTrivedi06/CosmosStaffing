import { CircleCheckBig } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHead } from "./SectionHead";
import { Placeholder } from "@/components/ui/Placeholder";
import { CountUp } from "@/components/motion/CountUp";
import { Parallax } from "@/components/motion/Parallax";
import { Stagger, RevealItem } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

const NUM_CLASS =
  "font-display text-[clamp(2.4rem,1.4rem+3vw,3.4rem)] leading-none font-[580] tracking-[-0.04em] text-ink tabular-nums";

function Stat({
  index,
  num,
  label,
}: {
  index: number;
  num: React.ReactNode;
  label: React.ReactNode;
}) {
  return (
    <RevealItem
      className={cn(
        "flex flex-col gap-2",
        index > 0 &&
          "min-[981px]:border-l min-[981px]:border-hairline min-[981px]:pl-8 max-[560px]:border-t max-[560px]:border-hairline max-[560px]:pt-6",
      )}
    >
      <span className={NUM_CLASS}>{num}</span>
      <span className="max-w-[22ch] text-sm text-muted">{label}</span>
    </RevealItem>
  );
}

export function Stats() {
  return (
    <Section className="overflow-hidden">
      <Parallax
        speed={0.05}
        aria-hidden
        className="pointer-events-none absolute bottom-[-30%] left-[30%]"
      >
        <div className="hero-glow" style={{ opacity: 0.22 }} />
      </Parallax>

      <Container className="relative z-1">
        <SectionHead
          eyebrow="Proof"
          title="Backed by experience, built local."
          lead={
            <>
              Cosmos Staffing is based in <Placeholder>Pflugerville</Placeholder>
              , Texas, with recruiters who live and work in Central Texas.
              We&apos;re part of a family group with <Placeholder>30+</Placeholder>{" "}
              years in workforce services and{" "}
              <Placeholder>200,000+</Placeholder> placements.
            </>
          }
        />

        <Stagger className="mt-[clamp(40px,5vw,64px)] grid grid-cols-4 gap-8 max-[980px]:grid-cols-2 max-[980px]:gap-4 max-[560px]:grid-cols-1">
          <Stat
            index={0}
            num={<CountUp to={30} suffix="+" />}
            label={
              <>
                years of group experience <Placeholder>30+</Placeholder>
              </>
            }
          />
          <Stat
            index={1}
            num={
              <span className="[&_.ph]:align-[0.35em] [&_.ph]:text-[0.5em]">
                <Placeholder>XX</Placeholder>
              </span>
            }
            label="-hour response on talent requests"
          />
          <Stat
            index={2}
            num={<CountUp to={90} />}
            label={
              <>
                -day replacement guarantee <Placeholder>90</Placeholder>
              </>
            }
          />
          <Stat
            index={3}
            num={
              <CircleCheckBig
                className="size-10 text-accent"
                strokeWidth={1.6}
                aria-hidden
              />
            }
            label="Every candidate pre-screened"
          />
        </Stagger>
      </Container>
    </Section>
  );
}
