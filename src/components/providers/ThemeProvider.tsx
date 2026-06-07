"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * App-wide theme provider. Uses next-themes with the `data-theme` attribute so
 * it drives the design's `[data-theme="…"]` token blocks directly. System
 * default, persisted to localStorage, with the no-flash inline script.
 *
 * We intentionally do NOT set `disableTransitionOnChange` — the smooth token
 * cross-fade is handled by the `.theme-anim` class toggled in ThemeToggle.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
