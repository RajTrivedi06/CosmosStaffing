import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { cleaners, siteConfig } from "@/lib/site";
import { Placeholder } from "@/components/ui/Placeholder";
import { ApplyAction, CleanerSignIn } from "@/components/cleaners/ApplyAction";

export const metadata: Metadata = pageMetadata({
  title: "Clean with Cosmos",
  description: `Independent cleaners in Texas: the opportunity and invitation-led onboarding with ${siteConfig.name}.`,
  path: cleaners.path,
});

/**
 * Recruitment for independent cleaners. The application, sign-in and
 * onboarding live in the Operations Studio; this page only explains them and
 * links in (see `cleaners` in lib/site.ts). It collects nothing.
 */
export default function CleanWithCosmosPage() {
  return (
    <main id="main" className="page">
      <div className="cleaners pad">
        <header className="cleaners-intro">
          <h1>{cleaners.title}</h1>
          <p className="lede">{cleaners.lede}</p>
          <div className="cleaners-apply" id="apply">
            <ApplyAction />
            <CleanerSignIn withNote />
          </div>
        </header>

        <section className="cleaners-expect" aria-labelledby="expect-h">
          <h2 id="expect-h">What to expect</h2>
          <ol className="expect-list">
            {cleaners.expect.map((item) => (
              <li key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ol>

          <div className="expect-notes">
            <div>
              <h3>{cleaners.areasTitle}</h3>
              <ul className="cities" aria-label="Areas in Texas">
                {cleaners.areas.map((area) => (
                  <li key={area}>{area}</li>
                ))}
              </ul>
            </div>
            <p>
              {cleaners.insurance}{" "}
              <Placeholder>{cleaners.insurancePending}</Placeholder>
            </p>
            <p>{cleaners.independent}</p>
            <div>
              <h3>{cleaners.pendingTitle}</h3>
              <ul className="pending-list">
                {cleaners.pending.map((item) => (
                  <li key={item}>
                    <Placeholder>{item}</Placeholder>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
