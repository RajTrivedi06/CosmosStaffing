import type { NextConfig } from "next";
import { studioOrigin, studioRewrites } from "./src/lib/studio-routes";

/** Where the Studio's recipient pages are forwarded (see lib/studio-routes). */
const STUDIO_ORIGIN = studioOrigin(process.env.STUDIO_ORIGIN);

/** Pages from the old Cosmos Staffing site, removed in the cleaning rebrand. */
const STAFFING_PAGES = [
  "/staffing",
  "/hr-payroll",
  "/bookkeeping",
  "/professional-search",
  "/jobs",
];

const nextConfig: NextConfig = {
  // Test builds use their own folder so they never disturb a running
  // `npm run dev`, which writes to .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    // Full-screen 4K photography: serve AVIF where supported, then WebP.
    formats: ["image/avif", "image/webp"],
    // Photos are encoded at 90 (see PHOTO_QUALITY); 75 softened fine detail.
    qualities: [90],
    // Extra steps above 2048 so retina laptops and 4K/5K screens get a
    // close match instead of jumping straight to 3840 or capping there.
    deviceSizes: [
      640, 750, 828, 1080, 1200, 1920, 2048, 2560, 3072, 3840, 4096, 5120,
    ],
  },
  // Old links land somewhere useful instead of a 404. /contact exists again.
  async redirects() {
    return [
      { source: "/about", destination: "/services", permanent: true },
      ...STAFFING_PAGES.flatMap((page) => [
        { source: page, destination: "/", permanent: true },
        { source: `${page}/:path*`, destination: "/", permanent: true },
      ]),
    ];
  },
  // The Studio's recipient pages and portal, forwarded before this site's
  // own pages and public files are checked so nothing here can shadow them.
  // Their no-store/noindex headers live in vercel.json, where the Studio's
  // guide puts them for Vercel's edge to add to the forwarded responses.
  // (headers() here is not applied to forwarded responses by `next start`.)
  async rewrites() {
    return { beforeFiles: studioRewrites(STUDIO_ORIGIN) };
  },
};

export default nextConfig;
