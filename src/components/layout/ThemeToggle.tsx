"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useMounted } from "@/lib/hooks";

/**
 * Light/dark toggle. Briefly adds `.theme-anim` to <html> so the token swap
 * cross-fades, then flips the theme. Icon renders only after mount to avoid a
 * hydration mismatch (the resolved theme isn't known on the server).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const toggle = () => {
    const root = document.documentElement;
    root.classList.add("theme-anim");
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
    window.setTimeout(() => root.classList.remove("theme-anim"), 460);
  };

  // Gate everything theme-dependent on `mounted` so the server render and the
  // first client render agree (resolvedTheme is unknown on the server).
  const isDark = mounted && resolvedTheme === "dark";
  const label = mounted
    ? `Switch to ${isDark ? "light" : "dark"} theme`
    : "Toggle color theme";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
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
