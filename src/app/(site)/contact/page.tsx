import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import Link from "next/link";
import { cleaners, contactPage, coverage, siteConfig } from "@/lib/site";
import { Placeholder } from "@/components/ui/Placeholder";
import { CleanerSignIn } from "@/components/cleaners/ApplyAction";

export const metadata: Metadata = pageMetadata({
  title: "Contact us",
  description: `Talk to ${siteConfig.name} about cleaning for your home or workplace.`,
  path: "/contact",
});

export default function ContactPage() {
  const { actions } = contactPage;
  return (
    <main id="main" className="page">
      <header className="page-hero pad">
        <h1>{contactPage.title}</h1>
        <p className="lede">{contactPage.lede}</p>
      </header>
      <div className="contact pad">
        <dl className="contact-list">
          <div>
            <dt>Phone</dt>
            <dd>
              <Placeholder>phone</Placeholder>
            </dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>
              <Placeholder>email</Placeholder>
            </dd>
          </div>
          <div>
            <dt>Hours</dt>
            <dd>
              <Placeholder>office hours</Placeholder>
            </dd>
          </div>
        </dl>
        <p className="lede">{coverage.summary}</p>
      </div>
      <section className="contact-actions pad" aria-labelledby="actions-h">
        <h2 id="actions-h">{actions.title}</h2>
        <div className="contact-paths">
          <div className="contact-path">
            <h3>{actions.clients.title}</h3>
            <p>{actions.clients.body}</p>
            <Link className="btn btn-primary" href={siteConfig.primaryCta.href}>
              {actions.clients.label}
            </Link>
          </div>
          <div className="contact-path">
            <h3>{actions.cleaners.title}</h3>
            <p>{actions.cleaners.body}</p>
            {/* While the Studio's application is not open, this leads to the
                recruitment page, which says so; once it is, straight in. */}
            {cleaners.apply.available ? (
              <a className="btn btn-primary" href={cleaners.apply.href}>
                {cleaners.apply.label}
              </a>
            ) : (
              <Link className="btn btn-primary" href={`${cleaners.path}#apply`}>
                {cleaners.apply.label}
              </Link>
            )}
            <CleanerSignIn />
          </div>
        </div>
      </section>
    </main>
  );
}
