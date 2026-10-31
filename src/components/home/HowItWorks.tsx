import Link from "next/link";
import { home, images, siteConfig } from "@/lib/site";
import { Frame } from "./Frame";

/** 09:00. Three steps make the job feel small. */
export function HowItWorks() {
  return (
    <section
      className="chapter pad"
      id="how"
      data-time="09:00"
      data-bg="#f3f2ec"
      aria-labelledby="how-h"
    >
      <div className="two">
        <Frame
          image={images.hands}
          alt={home.how.alt}
          sizes="(max-width: 860px) 100vw, 45vw"
        />
        <div className="how-copy">
          <h2 id="how-h">{home.how.title}</h2>
          <ol className="steps">
            {home.how.steps.map((step) => (
              <li key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
          <Link className="btn btn-primary" href={siteConfig.primaryCta.href}>
            {siteConfig.primaryCta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
