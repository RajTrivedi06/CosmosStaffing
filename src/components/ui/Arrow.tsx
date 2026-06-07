import { cn } from "@/lib/utils";

/** The design's inline arrow. Slides right when inside a hovered `.group`. */
export function Arrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={cn(
        "size-4 flex-none transition-transform duration-200 ease-soft group-hover:translate-x-[3px]",
        className,
      )}
    >
      <path
        d="M3 8h9M8.5 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
