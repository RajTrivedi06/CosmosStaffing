import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Reveal, Stagger, RevealItem } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

const SHEETS = [
  { top: 0, rotate: -7, keep: false },
  { top: 18, rotate: 5, keep: false },
  { top: 38, rotate: -3, keep: false },
  { top: 120, rotate: 0, keep: true },
  { top: 218, rotate: 0, keep: true },
];

export function ProblemSection() {
  return (
    <Section data-screen-label="Problem">
      <Container className="grid items-center gap-[clamp(40px,6vw,88px)] md:grid-cols-[1fr_0.9fr]">
        <Stagger>
          <RevealItem>
            <Eyebrow className="mb-6">The problem</Eyebrow>
          </RevealItem>
          <RevealItem>
            <h2 className="text-h1">Hiring in Austin is eating your week.</h2>
          </RevealItem>
          <RevealItem>
            <p className="mt-6 max-w-[60ch] text-body-lg leading-relaxed text-muted">
              You post a role and get buried in resumes, most of them wrong. The
              agency you tried sent a stack and hoped one would stick. A good
              hire walked after a month. Meanwhile payroll questions, a missed
              shift, and three unanswered emails are all yours to deal with.
            </p>
          </RevealItem>
          <RevealItem>
            <p className="mt-8 border-l-2 border-accent pl-6 font-display text-h3 leading-[1.32] font-[520] tracking-[-0.02em]">
              You don&apos;t need more applicants. You need the right two or
              three, confirmed, fast, and someone accountable when something
              goes sideways.
            </p>
          </RevealItem>
        </Stagger>

        <Reveal aria-hidden className="relative h-[360px] w-full max-[820px]:h-[280px]">
          {SHEETS.map((s, i) => (
            <div
              key={i}
              className={cn("resume-sheet", s.keep && "keep")}
              style={{
                top: s.top,
                transform: `translateX(-50%) rotate(${s.rotate}deg)`,
              }}
            >
              <div className="bar" />
              <div className="bar short" />
            </div>
          ))}
        </Reveal>
      </Container>
    </Section>
  );
}
