import Link from "next/link";
import { home, siteConfig } from "@/lib/site";

/** 21:00. The slogan once more, with the one button. */
export function CloseCta() {
  return (
    <section
      className="close-cta pad"
      data-time="21:00"
      data-bg="#e4c6a5"
      aria-labelledby="close-h"
    >
      <h2 id="close-h">
        {siteConfig.sloganLines[0]}
        <br />
        {siteConfig.sloganLines[1]}
      </h2>
      <div className="cta-row">
        <Link className="btn btn-primary" href={siteConfig.primaryCta.href}>
          {siteConfig.primaryCta.label}
        </Link>
        <span className="micro">{home.close.micro}</span>
      </div>
    </section>
  );
}
