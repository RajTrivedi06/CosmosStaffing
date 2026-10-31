import Link from "next/link";
import { home, images, siteConfig } from "@/lib/site";
import { ArtImage } from "@/components/ui/ArtImage";
import { Placeholder } from "@/components/ui/Placeholder";

/**
 * 07:00. The slogan on plain ground beside a framed photo. On scroll the
 * frame opens to the whole screen and pushes toward the window, while the
 * two "say" lines take over from the headline (motion in <DayScroll>).
 */
export function Hero() {
  const [sayOne, sayTwo] = home.hero.say;

  return (
    <section
      className="hero"
      data-time="07:00"
      data-bg="#eef0ec"
      aria-label="Introduction"
    >
      <div className="hero-stage">
        <div className="hero-media" id="hero-media">
          <ArtImage
            wide={images.heroWide}
            tall={images.heroTall}
            alt={home.hero.alt}
            eager
            zoom={1.3}
          />
          <div className="hero-scrim" id="hero-scrim" />
        </div>
        <div className="frame-slot" id="frame-slot" aria-hidden="true" />

        <div className="hero-copy" id="hero-copy">
          <h1>
            {siteConfig.sloganLines[0]}
            <br />
            {siteConfig.sloganLines[1]}
          </h1>
          <p className="lede">{home.hero.lede}</p>
          <div className="cta-row">
            <Link className="btn btn-primary" href={siteConfig.primaryCta.href}>
              {siteConfig.primaryCta.label}
            </Link>
            <a className="btn btn-quiet" href={home.hero.secondaryCta.href}>
              {home.hero.secondaryCta.label}
            </a>
          </div>
          <div className="trust">
            {home.hero.trust.map((item) => (
              <span key={item}>
                <Placeholder>to confirm: {item}</Placeholder>
              </span>
            ))}
          </div>
        </div>

        <p className="say" id="say-1">
          {sayOne}
        </p>
        <p className="say" id="say-2">
          {sayTwo}
        </p>
      </div>
    </section>
  );
}
