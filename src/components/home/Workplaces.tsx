import Link from "next/link";
import { home, images } from "@/lib/site";
import { ArtImage } from "@/components/ui/ArtImage";
import { Placeholder } from "@/components/ui/Placeholder";

/** 13:00. The second audience gets its own full-screen moment. */
export function Workplaces() {
  return (
    <section
      className="band"
      id="workplaces"
      data-time="13:00"
      data-bg="#f7f0e4"
      aria-labelledby="work-h"
    >
      <div className="stage">
        <div className="band-media" id="band-media">
          <ArtImage
            wide={images.bandWide}
            tall={images.bandTall}
            alt={home.workplaces.alt}
            zoom={1.12}
          />
        </div>
        <div className="stage-copy" id="band-copy">
          <h2 id="work-h">{home.workplaces.title}</h2>
          <p>
            {home.workplaces.body}{" "}
            <Placeholder>to confirm: {home.workplaces.bodyConfirm}</Placeholder>
          </p>
          <Link className="btn btn-light" href={home.workplaces.href}>
            {home.workplaces.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
