import { home } from "@/lib/site";
import { Placeholder } from "@/components/ui/Placeholder";

/** 16:30. Real reviews go here, placed just before pricing. */
export function Reviews() {
  return (
    <section
      className="chapter pad"
      data-time="16:30"
      data-bg="#f2e1ca"
      aria-labelledby="rev-h"
    >
      <div className="stack" style={{ gap: 16 }}>
        <h2 id="rev-h">{home.reviews.title}</h2>
        <div className="rating">
          <Placeholder>average rating and review count</Placeholder>
        </div>
      </div>
      <div className="reviews">
        {home.reviews.items.map((review) => (
          <figure key={review.quote} className="review">
            <blockquote>
              <Placeholder>{review.quote}</Placeholder>
            </blockquote>
            <figcaption>
              <Placeholder>{review.who}</Placeholder> &middot; {review.service}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
