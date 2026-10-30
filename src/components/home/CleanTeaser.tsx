import Link from "next/link";
import { cleaners } from "@/lib/site";
import { CleanerSignIn } from "@/components/cleaners/ApplyAction";

/**
 * After the day is done, a quiet note for the other audience: independent
 * cleaners. Sits outside the day's clock, after the last call to book.
 */
export function CleanTeaser() {
  return (
    <section
      className="clean-teaser pad"
      id="clean-with-cosmos"
      aria-labelledby="clean-h"
    >
      <div>
        <h2 id="clean-h">{cleaners.teaser.title}</h2>
        <p>{cleaners.teaser.body}</p>
      </div>
      <div className="cta-row">
        <Link className="btn btn-quiet" href={cleaners.path}>
          {cleaners.teaser.more}
        </Link>
        <CleanerSignIn />
      </div>
    </section>
  );
}
