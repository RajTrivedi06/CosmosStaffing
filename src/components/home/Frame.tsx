import Image from "next/image";
import type { CSSProperties } from "react";
import { PHOTO_QUALITY, type SiteImage } from "@/lib/site";

/** Frames are 4:5 portraits (`.frame` in globals.css). */
const FRAME_RATIO = 4 / 5;

type FrameProps = {
  image: SiteImage;
  alt: string;
  /** Rendered width of the frame, for srcset selection. */
  sizes: string;
  objectPosition?: CSSProperties["objectPosition"];
};

/** A framed photo that opens out as it scrolls into view (see <DayScroll>). */
export function Frame({ image, alt, sizes, objectPosition }: FrameProps) {
  // A photo wider than the frame is cropped to fill its height, so it renders
  // wider than the frame itself. Scale the hint up to match, or the browser
  // picks a file that is too small and the crop looks soft.
  const overflow = Math.max(1, image.width / image.height / FRAME_RATIO);
  const imageSizes = sizes.replace(
    /(\d+(?:\.\d+)?)vw/g,
    (_, n: string) => `${Math.ceil(Number(n) * overflow)}vw`,
  );

  return (
    <div className="frame" data-reveal>
      <Image
        src={image.src}
        width={image.width}
        height={image.height}
        alt={alt}
        sizes={imageSizes}
        quality={PHOTO_QUALITY}
        style={objectPosition ? { objectPosition } : undefined}
      />
    </div>
  );
}
