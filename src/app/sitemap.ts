import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

/** Public pages. Old staffing URLs redirect (next.config.ts) and stay out. */
const PAGES = [
  { path: "/", priority: 1 },
  { path: "/quote", priority: 0.9 },
  { path: "/services", priority: 0.8 },
  { path: "/contact", priority: 0.6 },
  { path: "/terms", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map(({ path, priority }) => ({
    url: new URL(path, siteConfig.url).toString(),
    changeFrequency: "monthly",
    priority,
  }));
}
