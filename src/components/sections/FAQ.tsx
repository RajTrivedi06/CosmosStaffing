import { Stagger, RevealItem } from "@/components/motion/Reveal";

export type FaqItem = { q: string; a: React.ReactNode };

/**
 * Accessible FAQ accordion built on native <details>/<summary> — fully
 * keyboard-operable and works without JS. The +/- glyph collapses on open.
 */
export function FAQ({ items }: { items: FaqItem[] }) {
  return (
    <Stagger className="flex flex-col">
      {items.map(({ q, a }) => (
        <RevealItem key={q}>
          <details className="group border-b border-hairline">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-6 font-display text-h3 font-[520] tracking-[-0.02em] [&::-webkit-details-marker]:hidden">
              <span>{q}</span>
              <span className="relative size-[22px] flex-none" aria-hidden="true">
                <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-accent" />
                <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-accent transition-transform duration-300 ease-expo group-open:scale-y-0" />
              </span>
            </summary>
            <p className="max-w-[70ch] pb-6 text-muted">{a}</p>
          </details>
        </RevealItem>
      ))}
    </Stagger>
  );
}
