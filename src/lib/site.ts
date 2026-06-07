/**
 * Central site configuration — brand, navigation, services, and service area.
 *
 * Keep brand/content here rather than hard-coding it in pages. Note: the real
 * NAP (name, address, phone) and email are intentionally left as visible
 * `[PLACEHOLDER: …]` tokens and rendered via the <Placeholder> component —
 * do not replace them with invented values.
 */
export const siteConfig = {
  name: "Cosmos Staffing",
  legalName: "Cosmos Services LLC",
  tagline: "The right people for your Austin team",
  description:
    "Cosmos Staffing places vetted clerical, professional, and technical " +
    "talent with Central Texas businesses — and handles the HR, payroll, and " +
    "bookkeeping behind them.",
  // TODO: set the production domain once chosen. Used for metadata, sitemap,
  // robots, and structured data.
  url: "https://example.com",

  /** Header navigation — mirrors the primary design (Professional Search lives
   *  in the services bento + footer, not the top bar). */
  nav: [
    { label: "About", href: "/about" },
    { label: "Staffing & Recruiting", href: "/staffing" },
    { label: "HR & Payroll", href: "/hr-payroll" },
    { label: "Bookkeeping", href: "/bookkeeping" },
    { label: "For Job Seekers", href: "/jobs" },
    { label: "Contact", href: "/contact" },
  ],

  /** Services — used by the homepage bento, the footer, and as routes. */
  services: [
    {
      title: "Staffing & Recruiting",
      href: "/staffing",
      blurb:
        "Clerical, administrative, and light industrial talent on temporary, " +
        "temp-to-hire, and direct-hire terms. Screened, reference-checked, ready to work.",
    },
    {
      title: "Professional Search",
      href: "/professional-search",
      blurb:
        "Engineering, IT, finance, program management, and other specialized " +
        "roles, sourced by recruiters who understand the function.",
    },
    {
      title: "HR & Payroll",
      href: "/hr-payroll",
      blurb:
        "W-2 employment, payroll, and HR administration for the people we " +
        "place, so the paperwork isn't your problem.",
    },
    {
      title: "Bookkeeping",
      href: "/bookkeeping",
      blurb:
        "Back-office bookkeeping for small and mid-sized Austin businesses, " +
        "kept current and clean.",
    },
  ],

  /** Footer "Company" column. */
  companyNav: [
    { label: "About", href: "/about" },
    { label: "For Job Seekers", href: "/jobs" },
    { label: "Contact", href: "/contact" },
  ],

  /** Central Texas service area — stated copy, not placeholders. */
  serviceArea: [
    "Austin",
    "Round Rock",
    "Cedar Park",
    "Pflugerville",
    "Georgetown",
    "Kyle",
    "Buda",
    "Leander",
  ],

  social: {
    linkedin: "#",
  },
} as const;

export type SiteConfig = typeof siteConfig;
export type NavItem = (typeof siteConfig.nav)[number];
export type Service = (typeof siteConfig.services)[number];
