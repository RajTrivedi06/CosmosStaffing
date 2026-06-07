import { cn } from "@/lib/utils";

type CardProps = React.ComponentPropsWithoutRef<"div"> & {
  /** Lift + accent-tinted border + shadow on hover. */
  lift?: boolean;
};

/** Surface card with hairline border. */
export function Card({ lift, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-hairline bg-surface p-[clamp(22px,3vw,34px)] transition-[transform,box-shadow,border-color] duration-420 ease-expo",
        lift &&
          "hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--hairline))] hover:shadow-(--shadow-md)",
        className,
      )}
      {...props}
    />
  );
}
