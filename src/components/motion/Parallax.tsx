"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { useReducedMotionSafe } from "./useReducedMotionSafe";
import { useMediaQuery } from "@/lib/hooks";

type ParallaxProps = {
  children?: React.ReactNode;
  className?: string;
  /** Drift amount as a fraction of viewport travel (matches design speeds). */
  speed?: number;
  "aria-hidden"?: boolean;
};

/**
 * Subtle multi-layer parallax: translates on Y as the element passes through
 * the viewport. Desktop-only and disabled under reduced motion (per the brief,
 * parallax is dropped on mobile for performance).
 */
export function Parallax({
  children,
  className,
  speed = 0.1,
  ...rest
}: ParallaxProps) {
  const reduced = useReducedMotionSafe();
  const isDesktop = useMediaQuery("(min-width: 821px)");
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const range = speed * 220;
  const y = useTransform(scrollYProgress, [0, 1], [range, -range]);

  const enabled = !reduced && isDesktop;

  return (
    <motion.div
      ref={ref}
      className={className}
      style={enabled ? { y } : undefined}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
