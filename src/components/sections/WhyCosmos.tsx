import { ListChecks, CircleDollarSign, ShieldCheck } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHead } from "./SectionHead";
import { Placeholder } from "@/components/ui/Placeholder";
import { Stagger, RevealItem } from "@/components/motion/Reveal";

const ITEMS = [
  {
    Icon: ListChecks,
    title: "You see a shortlist, not a stack.",
    body: (
      <>
        Senior recruiters screen before submittal. The most common complaint
        about staffing agencies is being flooded with unqualified resumes.
        We&apos;re built to do the opposite.
      </>
    ),
  },
  {
    Icon: CircleDollarSign,
    title: "Pricing you can actually read.",
    body: (
      <>
        We explain what&apos;s in a bill rate and what a placement costs before
        you commit. No hidden markups, no surprise conversion fees.
      </>
    ),
  },
  {
    Icon: ShieldCheck,
    title: "A real guarantee, in writing.",
    body: (
      <>
        If a direct-hire placement doesn&apos;t work out within{" "}
        <Placeholder>90</Placeholder> days, we replace them at no additional
        fee. We respond to every request within{" "}
        <Placeholder>one business day</Placeholder>.
      </>
    ),
  },
];

export function WhyCosmos() {
  return (
    <Section>
      <Container>
        <SectionHead eyebrow="Why Cosmos" title="What's different here." />

        <Stagger className="mt-[clamp(40px,5vw,64px)] grid gap-8 md:grid-cols-3">
          {ITEMS.map(({ Icon, title, body }) => (
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
  );
}
