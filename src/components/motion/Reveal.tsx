"use client";

import { motion, type Variants } from "motion/react";
import { useReducedMotionSafe } from "./useReducedMotionSafe";

const EASE_EXPO = [0.16, 1, 0.3, 1] as const;

type BaseProps = {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  "aria-hidden"?: boolean;
};

// Transform + opacity only (no filter) — calmer and paint-free.
const hidden = { opacity: 0, y: 20 };
const shown = { opacity: 1, y: 0 };

/** Fade + rise (+ subtle blur) when scrolled into view. Once. */
export function Reveal({
  children,
  className,
  style,
  delay = 0,
  amount = 0.2,
  ...rest
}: BaseProps & { delay?: number; amount?: number }) {
  const reduced = useReducedMotionSafe();
  if (reduced) {
    return (
      <div className={className} style={style} {...rest}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      className={className}
      style={style}
      initial={hidden}
      whileInView={shown}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.64, ease: EASE_EXPO, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

const itemVariants: Variants = {
  hidden,
  show: { ...shown, transition: { duration: 0.64, ease: EASE_EXPO } },
};

/**
 * Container that staggers its <RevealItem> children into view, mirroring the
 * design's `[data-stagger]` groups (~75ms between items).
 */
export function Stagger({
  children,
  className,
  style,
  stagger = 0.06,
  amount = 0.2,
  ...rest
}: BaseProps & { stagger?: number; amount?: number }) {
  const reduced = useReducedMotionSafe();
  if (reduced) {
    return (
      <div className={className} style={style} {...rest}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={{ show: { transition: { staggerChildren: stagger } } }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** A single staggered item — only meaningful inside <Stagger>. */
export function RevealItem({ children, className, style, ...rest }: BaseProps) {
  const reduced = useReducedMotionSafe();
  if (reduced) {
    return (
      <div className={className} style={style} {...rest}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      className={className}
      style={style}
      variants={itemVariants}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
