import { cn } from "@/lib/utils";

/** Centered content column at the site max-width with the fluid gutter. */
export function Container({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-(--maxw) px-(--gutter)",
        className,
      )}
      {...props}
    />
  );
}
