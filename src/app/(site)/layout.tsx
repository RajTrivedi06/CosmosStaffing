import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BookBar } from "@/components/layout/BookBar";

/** Header, footer and phone booking bar for the marketing pages. */
export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteNav />
      {children}
      <SiteFooter />
      <BookBar />
    </>
  );
}
