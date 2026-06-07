"use client";

import { motion } from "motion/react";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";
import { cn } from "@/lib/utils";

const EASE_EXPO = [0.16, 1, 0.3, 1] as const;

const LINES = [
  { text: "The right people", muted: false },
  { text: "for your Austin team.", muted: false },
  { text: "Without the pile", muted: true },
  { text: "of resumes.", muted: true },
];

/** The hero H1 with a per-line clip-mask reveal on load. */
export function HeroHeadline() {
  const reduced = useReducedMotionSafe();

  return (
    <h1 className="max-w-[17ch] font-display text-display leading-[1.02] font-[580] tracking-[-0.035em]">
      {LINES.map((line, i) => (
        <span key={line.text} className="block overflow-hidden">
          {reduced ? (
            <span className={cn("block", line.muted && "text-muted")}>
              {line.text}
            </span>
          ) : (
            <motion.span
              className={cn("block", line.muted && "text-muted")}
              initial={{ y: "105%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.82, ease: EASE_EXPO, delay: 0.05 + i * 0.09 }}
            >
              {line.text}
            </motion.span>
          )}
        </span>
      ))}
    </h1>
  );
}
