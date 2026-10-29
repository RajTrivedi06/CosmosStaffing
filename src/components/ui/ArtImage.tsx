import { getImageProps } from "next/image";
import { PHOTO_QUALITY, type SiteImage } from "@/lib/site";

type ArtImageProps = {
  /** Landscape crop, served to desktop and landscape screens. */
  wide: SiteImage;
  /** Portrait crop, served to phones and other tall screens. */
  tall: SiteImage;
  alt: string;
  id?: string;
  className?: string;
  /** Above the fold: load immediately with high priority. */
  eager?: boolean;
  /** Largest scale the scroll animation applies, so the file stays sharp. */
  zoom?: number;
};

/**
 * Rendered width of a full-screen `object-fit: cover` image: the viewport
 * width, or wider when the screen is squatter than the photo and the photo
 * fills the height instead. Multiplied by the animation's zoom.
 */
function coverSizes({ width, height }: SiteImage, zoom: number) {
  const vw = Math.ceil(100 * zoom);
  const vh = Math.ceil(100 * (width / height) * zoom);
  return `max(${vw}vw, ${vh}vh)`;
}

/**
 * Full-screen photograph with art direction: a separately composed tall crop
 * replaces the wide one on portrait screens (the same breakpoint the scroll
 * scenes use), rather than cropping the wide image down.
 */
export function ArtImage({
  wide,
  tall,
  alt,
  id,
  className,
  eager = false,
  zoom = 1,
}: ArtImageProps) {
  const common = { alt, quality: PHOTO_QUALITY };
  const {
    props: { srcSet: tallSrcSet, sizes: tallSizes },
  } = getImageProps({ ...common, ...tall, sizes: coverSizes(tall, zoom) });
  const { props } = getImageProps({
    ...common,
    ...wide,
    sizes: coverSizes(wide, zoom),
    loading: eager ? "eager" : "lazy",
    fetchPriority: eager ? "high" : undefined,
  });

  return (
    <picture>
      <source
        media="(max-aspect-ratio: 3/4)"
        srcSet={tallSrcSet}
        sizes={tallSizes}
      />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- props come from getImageProps, alt included */}
      <img {...props} id={id} className={className} />
    </picture>
  );
}
