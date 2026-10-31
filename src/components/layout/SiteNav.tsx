"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { account, cleaners, siteConfig } from "@/lib/site";
import { getLenis, scrollToHash, scrollToY } from "@/lib/scroll";

/** Ignore scroll movements smaller than this, so the bar never jitters. */
const SCROLL_THRESHOLD = 10;
/** Always show the full bar this close to the top of the page. */
const TOP_ZONE = 64;

/**
 * Fixed header. One glass pill holds the links and the "Get my price" button.
 * Scrolling down collapses the pill toward the button, which grows to fill
 * it; scrolling up opens it again. The right edge and the button stay put, so
 * it reads as one element changing shape. The wordmark and clock stay put,
 * on a matching glass backing once the page has scrolled, so they stay readable
 * over photos. Collapsed links are `inert`, so
 * they leave the tab order, and the bar stays open while the menu is open or
 * keyboard focus is inside it.
 *
 * On phones the links live in a full-screen menu sheet, which pauses page
 * scrolling, makes the rest of the page inert, closes on Escape and returns
 * focus to the Menu button.
 */
export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(true);
  /** An in-page destination picked in the sheet, scrolled to once it closes. */
  const pendingHash = useRef<string | null>(null);

  // Collapse on the way down, expand on the way up.
  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      setScrolled(y >= TOP_ZONE);
      const focusInside = headerRef.current?.querySelector(":focus-visible");
      if (y < TOP_ZONE || open || focusInside) {
        setCompact(false);
        lastY = y;
        return;
      }
      const dy = y - lastY;
      if (Math.abs(dy) < SCROLL_THRESHOLD) return;
      setCompact(dy > 0);
      lastY = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [open, pathname]);

  useEffect(() => {
    if (!open) return;

    const sheet = sheetRef.current;
    const menuBtn = menuBtnRef.current;
    const focusables = sheet?.querySelectorAll<HTMLElement>("a, button");
    focusables?.[0]?.focus();
    restoreFocus.current = true;

    // Freeze the page behind the sheet: stop smooth scrolling and take
    // everything else out of the accessibility tree and tab order.
    const lenis = getLenis();
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    const background = Array.from(document.body.children).filter(
      (el) => el !== sheet && !el.contains(sheet ?? null),
    );
    background.forEach((el) => el.setAttribute("inert", ""));

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
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
      background.forEach((el) => el.removeAttribute("inert"));
      document.documentElement.style.overflow = "";
      lenis?.start();
      if (restoreFocus.current) menuBtn?.focus();
      const hash = pendingHash.current;
      pendingHash.current = null;
      if (hash) {
        // The page is scrollable again only now, so glide on the next frame.
        requestAnimationFrame(() => {
          scrollToHash(hash);
          const dest = document.getElementById(hash.slice(1));
          dest?.setAttribute("tabindex", dest.getAttribute("tabindex") ?? "-1");
          dest?.focus({ preventScroll: true });
        });
      }
    };
  }, [open]);

  const close = () => setOpen(false);
  const closeForLink = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // The link moves focus to its destination; don't pull it back.
    restoreFocus.current = false;
    const url = new URL(e.currentTarget.href);
    if (url.pathname === window.location.pathname && url.hash) {
      e.preventDefault();
      history.pushState(null, "", url.hash);
      pendingHash.current = url.hash;
    }
    setOpen(false);
  };

  const toTop = (e: React.MouseEvent) => {
    if (pathname !== "/") return;
    e.preventDefault();
    history.replaceState(null, "", "/");
    scrollToY(0);
  };

  return (
    <>
      <header
        ref={headerRef}
        className="nav pad"
        data-compact={compact || undefined}
        data-scrolled={scrolled || undefined}
        onFocus={(e) => {
          if (e.target.matches(":focus-visible")) setCompact(false);
        }}
      >
        <Link
          className="brand"
          href="/"
          aria-label={`${siteConfig.name}, back to top`}
          onClick={toTop}
        >
          <span className="wordmark">{siteConfig.shortName}</span>
          <span className="clock" id="clock" aria-hidden="true">
            07:00
          </span>
        </Link>
        <div className="nav-pill">
          <div className="nav-collapse" inert={compact}>
            <nav className="nav-links" aria-label="Main">
              {siteConfig.nav.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
              <button
                ref={menuBtnRef}
                className="menu-btn"
                type="button"
                aria-expanded={open}
                aria-controls="menu-sheet"
                onClick={() => setOpen(true)}
              >
                Menu
              </button>
            </nav>
          </div>
          <Link
            className="btn btn-primary nav-cta"
            href={siteConfig.primaryCta.href}
          >
            {siteConfig.primaryCta.label}
          </Link>
        </div>
      </header>

      <div
        ref={sheetRef}
        className="sheet"
        id="menu-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        hidden={!open}
        data-lenis-prevent
      >
        <button className="close" type="button" onClick={close}>
          Close
        </button>
        {siteConfig.nav.map((item) => (
          <Link key={item.href} href={item.href} onClick={closeForLink}>
            {item.label}
          </Link>
        ))}
        <Link
          className="btn btn-primary sheet-cta"
          href={siteConfig.primaryCta.href}
          onClick={closeForLink}
        >
          {siteConfig.primaryCta.label}
        </Link>
        <div className="sheet-more">
          <Link href={account.path} onClick={closeForLink}>
            {account.signInLabel}
          </Link>
          <Link href={cleaners.path} onClick={closeForLink}>
            {cleaners.label}
          </Link>
          {/* The cleaner portal belongs to the Studio: a plain link. */}
          <a href={cleaners.signIn.href}>{cleaners.signIn.label}</a>
        </div>
      </div>
    </>
  );
}
