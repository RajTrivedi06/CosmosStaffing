import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

/** The sharing image, a 1200×630 crop of the hero photo. */
export const shareImage = {
  url: "/og.jpg",
  width: 1200,
  height: 630,
  alt: "Colleagues working together at a walnut table in a bright, warm office.",
};

/**
 * Shared Open Graph fields. The image is listed here, not as a file
 * convention, because a page's own `openGraph` would drop an inherited one.
 */
export const baseOpenGraph = {
  type: "website",
  locale: "en_US",
  siteName: siteConfig.name,
  images: [shareImage],
} satisfies Metadata["openGraph"];

/**
 * Title, description, canonical URL and sharing card for one page. A page's
 * `openGraph` replaces the layout's whole object, so each page sets its own.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      ...baseOpenGraph,
      title: `${title} | ${siteConfig.name}`,
      description,
      url: path,
    },
  };
}
