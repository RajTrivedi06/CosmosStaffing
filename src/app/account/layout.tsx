import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f4efe7",
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

/** The quiet, single-card shell shared with /quote. Private: never indexed. */
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Every account page answers per request. Without this, a build made
  // without the auth settings would prerender "accounts off" for good.
  await connection();
  return (
    <div className="quote-shell account-shell">
      <header className="quote-top">
        <Link href="/" className="wordmark">
          {siteConfig.shortName}
        </Link>
        <Link href="/" className="quote-exit">
          Back to site
        </Link>
      </header>
      <main id="main" className="quote-card account-card">
        {children}
      </main>
      <p className="quote-foot">
        Need help?{" "}
        <Link href={siteConfig.contactCta.href}>
          {siteConfig.contactCta.label}
        </Link>
      </p>
    </div>
  );
}
