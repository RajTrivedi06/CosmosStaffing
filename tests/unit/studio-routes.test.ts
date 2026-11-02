import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import nextConfig from "../../next.config";
import vercelConfig from "../../vercel.json";
import { cleaners, siteConfig } from "@/lib/site";
import {
  isProductionHost,
  DEFAULT_STUDIO_ORIGIN,
  STUDIO_PATHS,
  studioOrigin,
  studioRewrites,
} from "@/lib/studio-routes";

/**
 * The template in the Studio's docs/03-guides/connect-company-domain.md
 * ("Vercel setup", step 4), copied verbatim on 2026-10-29. A pinned contract:
 * it cannot see the Studio repository, so when the Studio's template changes,
 * update this copy and the config in the same coordinated change.
 */
const DOCUMENTED = {
  rewrites: [
    {
      source: "/pay/:path+",
      destination: "https://studio.cosmosgroupusa.com/pay/:path+",
    },
    {
      source: "/join/:path+",
      destination: "https://studio.cosmosgroupusa.com/join/:path+",
    },
    {
      source: "/q/:path+",
      destination: "https://studio.cosmosgroupusa.com/q/:path+",
    },
    {
      source: "/o/:path+",
      destination: "https://studio.cosmosgroupusa.com/o/:path+",
    },
    { source: "/me", destination: "https://studio.cosmosgroupusa.com/me" },
    {
      source: "/me/:path+",
      destination: "https://studio.cosmosgroupusa.com/me/:path+",
    },
    {
      source: "/terms",
      destination: "https://studio.cosmosgroupusa.com/terms",
    },
    {
      source: "/studio-assets/_next/static/:path+",
      destination:
        "https://studio.cosmosgroupusa.com/studio-assets/_next/static/:path+",
    },
  ],
  headers: [
    {
      source: "/:flow(pay|join|q|o|me)/:path*",
      headers: [
        { key: "Cache-Control", value: "no-store, max-age=0" },
        { key: "CDN-Cache-Control", value: "no-store" },
        { key: "Vercel-CDN-Cache-Control", value: "no-store" },
        { key: "x-vercel-enable-rewrite-caching", value: "0" },
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        { key: "Referrer-Policy", value: "no-referrer" },
      ],
    },
  ],
};

describe("Studio forwarding", () => {
  it("matches the documented rewrite template exactly", () => {
    expect(studioRewrites(DEFAULT_STUDIO_ORIGIN)).toEqual(DOCUMENTED.rewrites);
  });

  it("vercel.json carries the documented no-store headers exactly", () => {
    expect(vercelConfig).toEqual({
      $schema: "https://openapi.vercel.sh/vercel.json",
      headers: DOCUMENTED.headers,
    });
  });

  it("next.config forwards them before this site's own routes, and only them", async () => {
    const rewrites = await nextConfig.rewrites!();
    expect(Array.isArray(rewrites)).toBe(false);
    if (Array.isArray(rewrites)) return;
    expect(rewrites.beforeFiles).toEqual(DOCUMENTED.rewrites);
    expect(rewrites.afterFiles ?? []).toEqual([]);
    expect(rewrites.fallback ?? []).toEqual([]);
    // headers() here covers only this site's own /account pages; forwarded
    // Studio responses take theirs from vercel.json.
    const headers = await nextConfig.headers!();
    expect(headers.map((rule) => rule.source)).toEqual([
      "/account",
      "/account/:path*",
      "/account/confirm",
    ]);
  });

  it("never forwards the staff login, the API, Next's assets or /apply", () => {
    for (const path of STUDIO_PATHS) {
      expect(path).not.toMatch(/^\/(login|api|_next|apply)(\/|$)/);
    }
  });

  it("accepts only a bare HTTPS origin (HTTP on loopback)", () => {
    expect(studioOrigin(undefined)).toBe(DEFAULT_STUDIO_ORIGIN);
    expect(studioOrigin("https://preview.example.vercel.app")).toBe(
      "https://preview.example.vercel.app",
    );
    expect(studioOrigin("http://127.0.0.1:3299")).toBe("http://127.0.0.1:3299");
    for (const bad of [
      "http://studio.example.com",
      "https://studio.example.com/path",
      "https://studio.example.com?x=1",
      "https://user:pass@studio.example.com",
      "studio.example.com",
    ]) {
      expect(() => studioOrigin(bad)).toThrow();
    }
  });
});

describe("Preview builds", () => {
  const ORIGIN = "https://studio-preview.example";
  const load = () => {
    vi.resetModules();
    return import("../../next.config");
  };
  beforeEach(() => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("STUDIO_ORIGIN", ORIGIN);
    vi.stubEnv("STUDIO_APPROVED_ORIGIN", ORIGIN);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("build for the approved Studio, and record where they forward", async () => {
    const { default: config } = await load();
    expect(config.env?.STUDIO_REWRITE_ORIGIN).toBe(ORIGIN);
  });

  it.each([
    ["no STUDIO_ORIGIN", { STUDIO_ORIGIN: "" }],
    ["no approval", { STUDIO_APPROVED_ORIGIN: "" }],
    ["a different origin", { STUDIO_ORIGIN: "https://other.example" }],
    ["a trailing slash", { STUDIO_ORIGIN: `${ORIGIN}/` }],
    [
      "the production Studio",
      {
        STUDIO_ORIGIN: DEFAULT_STUDIO_ORIGIN,
        STUDIO_APPROVED_ORIGIN: DEFAULT_STUDIO_ORIGIN,
      },
    ],
  ])("refuse to build with %s", async (_, env) => {
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    await expect(load()).rejects.toThrow(/STUDIO_APPROVED_ORIGIN/);
  });

  it("don't apply outside a Preview", async () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("STUDIO_APPROVED_ORIGIN", "");
    await expect(load()).resolves.toBeDefined();
  });
});

describe("production hosts", () => {
  it.each([
    "cosmosgroupusa.com",
    "www.cosmosgroupusa.com",
    "studio.cosmosgroupusa.com",
    "cosmosservicesllc.com",
    "www.cosmosservicesllc.com",
    "studio.cosmosservicesllc.com",
    "internal-tools-cosmos.vercel.app",
  ])("recognises %s", (host) => {
    expect(isProductionHost(host)).toBe(true);
  });

  it.each([
    "cosmosgroupusa.com.evil.example",
    "studio.cosmosgroupusa.com.evil.example",
    "cosmosservicesllc.com.evil.example",
    "evilcosmosgroupusa.com",
    "studio-cosmosgroupusa.com",
    "cosmosgroupusa.co",
    "cosmosgroupusaxcom",
    "internal-tools-cosmos.vercel.app.evil.example",
  ])("isn't fooled by %s", (host) => {
    expect(isProductionHost(host)).toBe(false);
  });
});

describe("cleaner links", () => {
  it("send cleaners to the Studio portal sign-in, never the staff login", () => {
    expect(cleaners.signIn.href).toBe("/me/login");
    const hrefs = [
      cleaners.signIn.href,
      cleaners.apply.href,
      ...siteConfig.footer.company.map((item) => item.href),
    ];
    for (const href of hrefs) {
      expect(href).not.toMatch(
        /^\/login|studio\.(cosmosgroupusa|cosmosservicesllc)\.com/,
      );
    }
  });

  it("keep the application closed until its path is forwarded", () => {
    // Opening it needs a coordinated rewrite for its path (see site.ts).
    const forwarded = STUDIO_PATHS.some(
      (path: string) =>
        path === cleaners.apply.href ||
        path.startsWith(`${cleaners.apply.href}/`),
    );
    expect(cleaners.apply.available).toBe(forwarded);
  });
});
