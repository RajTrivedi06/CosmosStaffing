import { cn } from "@/lib/utils";

/** Small mono uppercase label with a leading accent dash. */
export function Eyebrow({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-3 font-mono text-eyebrow tracking-[0.16em] text-muted uppercase",
        "before:h-px before:w-6 before:bg-accent before:content-['']",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}
