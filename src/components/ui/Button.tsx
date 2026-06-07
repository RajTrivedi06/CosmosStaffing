import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "ghost";
export type ButtonSize = "default" | "lg";

/**
 * Shared button classes. Use `<Button>` for real buttons and
 * `<Link className={buttonVariants(...)}>` for navigational CTAs.
 * The `group` class lets a child arrow icon slide on hover.
 */
export function buttonVariants({
  variant = "primary",
  size = "default",
}: { variant?: ButtonVariant; size?: ButtonSize } = {}): string {
  return cn(
    "group inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-btn border border-transparent font-body font-medium leading-none transition-[transform,background-color,border-color,box-shadow,color] duration-200 ease-soft will-change-transform",
    variant === "primary" &&
      "bg-accent text-white hover:bg-accent-hover hover:shadow-(--shadow-md) dark:text-[#0b0b0e]",
    variant === "ghost" &&
      "border-hairline text-ink hover:border-ink hover:bg-surface",
    size === "default" && "px-[22px] py-[13px] text-[1.0625rem]",
    size === "lg" && "px-7 py-4 text-body-lg",
  );
}

type ButtonProps = React.ComponentPropsWithoutRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
