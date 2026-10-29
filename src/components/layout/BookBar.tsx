import Link from "next/link";
import { siteConfig } from "@/lib/site";

/**
 * Phone-only booking bar within thumb reach. Hidden by default; <DayScroll>
 * shows it after the hero and hides it again over the quote invitation and the close.
 */
export function BookBar() {
  return (
    <div className="book-bar" id="book-bar">
      <span>
        A personal quote
        <br />
        in a few questions
      </span>
      <Link className="btn btn-primary" href={siteConfig.primaryCta.href}>
        {siteConfig.primaryCta.label}
      </Link>
    </div>
  );
}
