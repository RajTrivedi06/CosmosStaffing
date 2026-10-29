import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { siteConfig, terms } from "@/lib/site";
import { Placeholder } from "@/components/ui/Placeholder";

export const metadata: Metadata = pageMetadata({
  title: "Terms and conditions",
  description: `The terms for cleaning arranged by ${siteConfig.name}.`,
  path: "/terms",
});

/** Structure only: every section waits for approved wording. */
export default function TermsPage() {
  return (
    <main id="main" className="page">
      <header className="page-hero pad">
        <h1>{terms.title}</h1>
        <p className="lede">{terms.lede}</p>
      </header>
      <div className="terms pad">
        {terms.sections.map((s, i) => (
          <section key={s.title} aria-labelledby={`t-${i}`}>
            <h2 id={`t-${i}`}>{s.title}</h2>
            <p>
              <Placeholder>approved wording on {s.pending}</Placeholder>
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
