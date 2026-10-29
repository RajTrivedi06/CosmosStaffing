import Link from "next/link";
import { home, siteConfig } from "@/lib/site";

/** 17:00. No public price list: an invitation to a personal quote. */
export function Pricing() {
  return (
    <section
      className="chapter pad"
      id="pricing"
      data-time="17:00"
      data-bg="#efdac0"
      aria-labelledby="price-h"
    >
      <div className="quote-invite">
        <h2 id="price-h">{home.pricing.title}</h2>
        <p className="lede">{home.pricing.lede}</p>
        <div className="cta-row">
          <Link className="btn btn-primary" href={siteConfig.primaryCta.href}>
            {siteConfig.primaryCta.label}
          </Link>
          <Link className="btn btn-glass" href={siteConfig.contactCta.href}>
            {siteConfig.contactCta.label}
          </Link>
        </div>
        <p className="micro">{home.pricing.micro}</p>
      </div>
    </section>
  );
}
