import { Eyebrow } from "@/components/ui/Eyebrow";
import { Stagger, RevealItem } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

type SectionHeadProps = {
  eyebrow: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  className?: string;
  titleClassName?: string;
};

/** Eyebrow + heading + optional lead, staggered into view. */
export function SectionHead({
  eyebrow,
  title,
  lead,
  className,
  titleClassName,
}: SectionHeadProps) {
  return (
    <Stagger className={cn("max-w-[60ch]", className)}>
      <RevealItem>
        <Eyebrow className="mb-6">{eyebrow}</Eyebrow>
      </RevealItem>
      <RevealItem>
        <h2 className={cn("text-h2", titleClassName)}>{title}</h2>
      </RevealItem>
      {lead && (
        <RevealItem>
          <p className="mt-4 max-w-[60ch] text-body-lg text-muted">{lead}</p>
        </RevealItem>
      )}
    </Stagger>
  );
}
