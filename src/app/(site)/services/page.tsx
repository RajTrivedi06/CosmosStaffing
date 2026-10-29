import type { Metadata } from "next";
import Link from "next/link";
import {
  coverage,
  faq,
  images,
  services,
  servicesPage,
  siteConfig,
} from "@/lib/site";
import { Frame } from "@/components/home/Frame";
import { FaqList } from "@/components/ui/FaqList";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Home cleaning, deep cleans, move-in and move-out cleans and workplace cleaning, based in Texas and arranged across the US.",
};

export default function ServicesPage() {
  return (
    <main id="main" className="page">
      <header className="page-hero pad">
        <h1>{servicesPage.title}</h1>
        <p className="lede">{servicesPage.lede}</p>
        <div className="cta-row">
          <Link className="btn btn-primary" href={siteConfig.primaryCta.href}>
            {siteConfig.primaryCta.label}
          </Link>
          <Link className="btn btn-glass" href={siteConfig.contactCta.href}>
            {siteConfig.contactCta.label}
          </Link>
        </div>
      </header>

      <div className="svc-details pad">
        {services.map((s) => (
          <article
            key={s.id}
            id={s.id}
            className="svc-detail"
            aria-labelledby={`${s.id}-h`}
          >
            <Frame
              image={images[s.image]}
              alt={s.alt}
              sizes="(max-width: 860px) 100vw, 40vw"
              objectPosition={s.image === "office" ? "72% 50%" : undefined}
            />
            <div className="stack">
              <h2 id={`${s.id}-h`}>{s.title}</h2>
              <p className="lede">{s.detail}</p>
              <h3>Typically includes</h3>
              <ul className="ticks">
                {s.includes.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <Link className="btn btn-primary" href={`/quote?service=${s.id}`}>
                Get a {s.title.toLowerCase()} quote
              </Link>
            </div>
          </article>
        ))}
      </div>

      <section
        id="process"
        className="page-section pad"
        aria-labelledby="process-h"
      >
        <h2 id="process-h">{servicesPage.process.title}</h2>
        <ol className="steps process">
          {servicesPage.process.steps.map((step) => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="coverage"
        className="page-section pad"
        aria-labelledby="coverage-h"
      >
        <h2 id="coverage-h">{servicesPage.coverageTitle}</h2>
        <div className="coverage">
          <p className="lede">{coverage.summary}</p>
          <ul
            className="cities"
            aria-label={`Main markets in ${coverage.state}`}
          >
            {coverage.cities.map((city) => (
              <li key={city}>{city}</li>
            ))}
            <li className="cities-more">and beyond</li>
          </ul>
        </div>
      </section>

      <section id="faq" className="page-section pad" aria-labelledby="sfaq-h">
        <h2 id="sfaq-h">{servicesPage.faqTitle}</h2>
        <FaqList items={faq} />
      </section>

      <section
        id="terms"
        className="page-section pad"
        aria-labelledby="terms-h"
      >
        <h2 id="terms-h">{servicesPage.termsTitle}</h2>
        <p className="lede">{servicesPage.termsBody}</p>
        <Link className="btn btn-glass" href="/terms">
          Read the terms
        </Link>
      </section>
    </main>
  );
}
