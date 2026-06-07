"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { buttonVariants } from "@/components/ui/Button";
import { Arrow } from "@/components/ui/Arrow";
import { cn } from "@/lib/utils";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

/** Full-screen overlay menu. Traps focus, closes on Escape, locks body scroll. */
export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = panel?.querySelectorAll<HTMLElement>("a, button");
    focusables?.[0]?.focus();

    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  return (
    <div
      id="mobile-menu"
      ref={panelRef}
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-99 flex flex-col justify-center gap-2 bg-bg px-(--gutter) transition-[opacity,transform,visibility] duration-360 ease-expo min-[901px]:hidden",
        open
          ? "visible translate-y-0 opacity-100"
          : "invisible -translate-y-2 opacity-0",
      )}
    >
      {siteConfig.nav.map((item, i) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClose}
          tabIndex={open ? 0 : -1}
          style={{ transitionDelay: open ? `${i * 55}ms` : "0ms" }}
          className={cn(
            "py-1.5 font-display text-[clamp(1.8rem,8vw,2.6rem)] font-[540] tracking-[-0.03em] text-ink transition-[opacity,transform] duration-500 ease-expo",
            open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
          )}
        >
          {item.label}
        </Link>
      ))}
      <Link
        href="/contact"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        className={cn(buttonVariants({ size: "lg" }), "mt-8 self-start")}
      >
        Request Talent <Arrow />
      </Link>
    </div>
  );
}
