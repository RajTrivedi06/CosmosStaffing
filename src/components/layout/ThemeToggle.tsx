"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

/**
 * Light/dark toggle. Briefly adds `.theme-anim` to <html> so the token swap
 * cross-fades, then flips the theme. Icon renders only after mount to avoid a
 * hydration mismatch (the resolved theme isn't known on the server).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const toggle = () => {
    const root = document.documentElement;
    root.classList.add("theme-anim");
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
    window.setTimeout(() => root.classList.remove("theme-anim"), 460);
  };

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      className="grid size-[38px] place-items-center rounded-pill border border-hairline bg-surface text-ink transition-colors duration-200 hover:border-ink"
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-[17px]" />
        ) : (
          <Moon className="size-[17px]" />
        )
      ) : (
        <span className="size-[17px]" />
      )}
    </button>
  );
}
