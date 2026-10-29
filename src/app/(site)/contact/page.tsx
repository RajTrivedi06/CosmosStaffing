import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import Link from "next/link";
import { contactPage, coverage, siteConfig } from "@/lib/site";
import { Placeholder } from "@/components/ui/Placeholder";

export const metadata: Metadata = pageMetadata({
  title: "Contact us",
  description: `Talk to ${siteConfig.name} about cleaning for your home or workplace.`,
  path: "/contact",
});

export default function ContactPage() {
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
        <div className="cta-row">
          <Link className="btn btn-primary" href={siteConfig.primaryCta.href}>
            {siteConfig.primaryCta.label}
          </Link>
        </div>
      </div>
    </main>
  );
}
