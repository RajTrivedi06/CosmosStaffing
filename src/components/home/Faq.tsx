import Link from "next/link";
import { faq, home } from "@/lib/site";
import { FaqList } from "@/components/ui/FaqList";

/** 20:00. Answers the objections that stop bookings; the rest live on /services. */
export function Faq() {
  return (
    <section
      className="chapter pad"
      id="faq"
      data-time="20:00"
      data-bg="#e8cdae"
      aria-labelledby="faq-h"
    >
      <h2 id="faq-h">{home.faq.title}</h2>
      <FaqList items={faq.slice(0, home.faq.count)} />
      <Link className="btn btn-quiet more-link" href="/services#faq">
        {home.faq.more}
      </Link>
    </section>
  );
}
