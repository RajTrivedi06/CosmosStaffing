import Link from "next/link";
import { home, images, siteConfig } from "@/lib/site";
import { ArtImage } from "@/components/ui/ArtImage";

/**
 * 18:30. The family arrives home in late sun; as you scroll the same room
 * crossfades to evening and the headline pays off the slogan.
 */
export function Evening() {
  return (
    <section
      className="evening"
      data-time="18:30"
      data-bg="#ebd2b4"
      aria-labelledby="eve-h"
    >
      <div className="stage">
        <ArtImage
          wide={images.homeDayWide}
          tall={images.homeDayTall}
          alt=""
          zoom={1.08}
        />
        <ArtImage
          wide={images.homeEveWide}
          tall={images.homeEveTall}
          alt={home.evening.alt}
          id="eve-late"
          className="eve-late"
          zoom={1.08}
        />
        <div className="stage-copy" id="eve-copy">
          <h2 id="eve-h">{home.evening.title}</h2>
          <p>{home.evening.body}</p>
          <Link className="btn btn-light" href={siteConfig.primaryCta.href}>
            {siteConfig.primaryCta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
