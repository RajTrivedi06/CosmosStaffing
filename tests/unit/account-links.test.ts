import { beforeEach, describe, expect, it, vi } from "vitest";

/** The origin of every confirmation and reset link sent by email. */
let host = "";
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [] }),
  headers: async () => new Headers({ host }),
}));

async function origin(value: string) {
  host = value;
  const { siteOrigin } = await import("@/lib/account/server");
  return siteOrigin();
}

describe("email link origin", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_SITE_URL", ""));

  it.each([
    "cosmosservicesllc.com",
    "www.cosmosservicesllc.com",
    "cosmosstaffing-preview.vercel.app",
    "elsewhere.example.test",
    "",
  ])("uses the canonical domain, whatever host %j asked", async (value) => {
    expect(await origin(value)).toBe("https://cosmosservicesllc.com");
  });

  it("keeps a loopback host and its port for local tests", async () => {
    expect(await origin("127.0.0.1:3201")).toBe("http://127.0.0.1:3201");
  });
});
