import { Stagger, RevealItem } from "@/components/motion/Reveal";

export type Belief = { title: string; body: React.ReactNode };

/** Three (or more) value cards with an accent top-rule. Used on About + Bookkeeping. */
export function BeliefGrid({ items }: { items: Belief[] }) {
  return (
    <Stagger className="mt-8 grid gap-8 md:grid-cols-3">
      {items.map((b) => (
        <RevealItem key={b.title} className="border-t-2 border-accent pt-6">
          <h4 className="font-body text-body-lg font-[560]">{b.title}</h4>
          <p className="mt-3 text-sm text-muted">{b.body}</p>
        </RevealItem>
      ))}
    </Stagger>
  );
}
