import type { NextConfig } from "next";

/** Pages from the old Cosmos Staffing site, removed in the cleaning rebrand. */
const STAFFING_PAGES = [
  "/staffing",
  "/hr-payroll",
  "/bookkeeping",
  "/professional-search",
  "/jobs",
];

const nextConfig: NextConfig = {
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
};

export default nextConfig;
