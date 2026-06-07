"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { Container } from "@/components/ui/Container";
import { buttonVariants } from "@/components/ui/Button";
import { ThemeToggle } from "./ThemeToggle";
import { MobileMenu } from "./MobileMenu";
import { cn } from "@/lib/utils";

/** Fixed site header that condenses (thinner + backdrop blur) on scroll. */
export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the menu whenever the route changes.
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-100 border-b border-transparent transition-[padding,background-color,border-color,backdrop-filter] duration-380 ease-expo",
          scrolled
            ? "border-b-hairline bg-[color-mix(in_srgb,var(--bg)_78%,transparent)] py-[11px] backdrop-blur-[14px] backdrop-saturate-[160%]"
            : "py-5",
        )}
      >
        <Container className="flex items-center gap-8">
          <Link
            href="/"
            aria-label={`${siteConfig.name} home`}
            className="flex items-center gap-2.5 font-display font-[580] tracking-[-0.03em] transition-[font-size] duration-380 ease-expo"
            style={{ fontSize: scrolled ? "1.08rem" : "1.18rem" }}
          >
            <span
              aria-hidden="true"
              className={cn(
                "brand-mark transition-[width,height] duration-380 ease-expo",
                scrolled ? "size-[22px]" : "size-[26px]",
              )}
            />
            Cosmos
          </Link>

          <nav
            aria-label="Primary"
            className="ml-auto hidden items-center gap-[clamp(14px,1.6vw,26px)] min-[901px]:flex"
          >
            {siteConfig.nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative py-1 text-sm font-[480] whitespace-nowrap transition-colors duration-200 hover:text-ink",
                    active
                      ? "text-ink after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:bg-accent after:content-['']"
                      : "text-muted",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 max-[900px]:ml-auto">
            <ThemeToggle />
            <Link
              href="/contact"
              className={cn(buttonVariants(), "max-[900px]:hidden")}
            >
              Request Talent
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="hidden size-10 place-items-center rounded-btn border border-hairline bg-surface text-ink max-[900px]:grid"
            >
              {menuOpen ? (
                <X className="size-[18px]" />
              ) : (
                <Menu className="size-[18px]" />
              )}
            </button>
          </div>
        </Container>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
