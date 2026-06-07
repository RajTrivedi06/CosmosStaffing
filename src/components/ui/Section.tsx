import { cn } from "@/lib/utils";

type SectionProps = React.ComponentPropsWithoutRef<"section"> & {
  /** Reduced vertical rhythm (clamp 48–88px vs 64–128px). */
  tight?: boolean;
  /** Tinted band: bg-2 with hairline top/bottom borders. */
  tinted?: boolean;
};

/** A page section with the standard vertical rhythm. Pair with <Container>. */
export function Section({
  tight,
  tinted,
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(
        "relative",
        tight ? "py-[clamp(48px,7vw,88px)]" : "py-[clamp(64px,10vw,128px)]",
        tinted && "border-y border-hairline bg-bg-2",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
