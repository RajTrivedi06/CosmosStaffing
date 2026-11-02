import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  pairedStudio,
  prepareStudioRequest,
  studioAccessHeaders,
} from "@/lib/studio-access";
import { pairedOrigin } from "@/lib/studio-routes";

const token = vi.hoisted(() => vi.fn());
vi.mock("@vercel/oidc", () => ({ getVercelOidcToken: token }));

const ORIGIN = "https://studio-preview.example";
const ACCESS = "x-vercel-trusted-oidc-idp-token";
const VALUE = "synthetic-only-oidc-value";
const BYPASS = "x-vercel-protection-bypass";

const visitor = (path = "/q/synthetic") =>
  new NextRequest(`https://site.example${path}`, {
    headers: {
      [ACCESS]: "forged",
      [BYPASS]: "forged",
      "x-vercel-set-bypass-cookie": "true",
      "next-action": "kept",
      cookie: "_vercel_jwt=forged; cosmos-client-auth=kept",
    },
  });

beforeEach(() => {
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("STUDIO_APPROVED_ORIGIN", ORIGIN);
  vi.stubEnv("STUDIO_REWRITE_ORIGIN", ORIGIN);
  token.mockReset().mockResolvedValue(VALUE);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("pairedOrigin", () => {
  it("accepts only an exact, non-production origin", () => {
    expect(pairedOrigin(ORIGIN)).toBe(ORIGIN);
    expect(pairedOrigin("http://127.0.0.1:3299")).toBe("http://127.0.0.1:3299");
  });

  it.each([
    undefined,
    "",
    `${ORIGIN}/`,
    `${ORIGIN}:443`,
    `${ORIGIN}/path`,
    `${ORIGIN}?x=1`,
    "https://Studio-Preview.example",
    "http://studio-preview.example",
    "https://user:pass@studio-preview.example",
    "https://*.vercel.app",
    "studio-preview.example",
    "https://studio.cosmosgroupusa.com",
    "https://studio.cosmosgroupusa.com/",
    "https://STUDIO.cosmosgroupusa.com",
    "https://www.cosmosgroupusa.com",
    "https://studio.cosmosservicesllc.com",
    "https://studio.cosmosservicesllc.com/",
    "https://STUDIO.cosmosservicesllc.com",
    "https://www.cosmosservicesllc.com",
    "https://internal-tools-cosmos.vercel.app",
  ])("refuses %s", (value) => {
    expect(pairedOrigin(value)).toBeNull();
  });
});

describe("studioAccessHeaders", () => {
  it("adds the header only for the approved origin", async () => {
    expect(await studioAccessHeaders(ORIGIN)).toEqual({ [ACCESS]: VALUE });
    expect(await studioAccessHeaders("https://other.example")).toBeNull();
    expect(await studioAccessHeaders(`${ORIGIN}/`)).toBeNull();
    expect(token).toHaveBeenCalledTimes(1);
  });

  it("needs the build's origin to match too", async () => {
    vi.stubEnv("STUDIO_REWRITE_ORIGIN", "https://other.example");
    expect(pairedStudio(ORIGIN)).toBe(false);
    expect(await studioAccessHeaders(ORIGIN)).toBeNull();
    expect(token).not.toHaveBeenCalled();
  });

  it("asks for a fresh token every time", async () => {
    token.mockResolvedValueOnce("first").mockResolvedValueOnce("second");
    expect(await studioAccessHeaders(ORIGIN)).toEqual({ [ACCESS]: "first" });
    expect(await studioAccessHeaders(ORIGIN)).toEqual({ [ACCESS]: "second" });
  });

  it("can't go without a token", async () => {
    token.mockRejectedValue(new Error("no token"));
    expect(await studioAccessHeaders(ORIGIN)).toBeNull();
  });

  it.each(["production", "development", ""])(
    "needs nothing and asks for nothing on %s",
    async (env) => {
      vi.stubEnv("VERCEL_ENV", env);
      expect(await studioAccessHeaders(ORIGIN)).toEqual({});
      expect(token).not.toHaveBeenCalled();
    },
  );
});

describe("prepareStudioRequest", () => {
  it("replaces what a visitor sent with the server's own credential", async () => {
    const request = visitor();
    expect(await prepareStudioRequest(request)).toBeNull();
    expect(request.headers.get(ACCESS)).toBe(VALUE);
    expect(request.headers.get(BYPASS)).toBeNull();
    expect(request.headers.get("x-vercel-set-bypass-cookie")).toBeNull();
    expect(request.headers.get("next-action")).toBe("kept");
    expect(request.headers.get("cookie")).toBe("cosmos-client-auth=kept");
  });

  it.each([
    ["no approval", { STUDIO_APPROVED_ORIGIN: "" }],
    [
      "a production approval",
      { STUDIO_APPROVED_ORIGIN: "https://studio.cosmosgroupusa.com" },
    ],
    [
      "an approval of the Studio's current host",
      { STUDIO_APPROVED_ORIGIN: "https://studio.cosmosservicesllc.com" },
    ],
    [
      "a build forwarding elsewhere",
      { STUDIO_REWRITE_ORIGIN: "https://other.example" },
    ],
    ["no record of the build's origin", { STUDIO_REWRITE_ORIGIN: "" }],
  ])("forwards nothing from a Preview with %s", async (_, env) => {
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    const request = visitor();
    expect(await prepareStudioRequest(request)).toBe(503);
    expect(request.headers.get(ACCESS)).toBeNull();
  });

  it("forwards nothing from a Preview with no token", async () => {
    token.mockRejectedValue(new Error("no token"));
    const request = visitor();
    expect(await prepareStudioRequest(request)).toBe(503);
    expect(request.headers.get(ACCESS)).toBeNull();
  });

  it.each(["production", ""])("only strips, on %s", async (env) => {
    vi.stubEnv("VERCEL_ENV", env);
    vi.stubEnv("STUDIO_APPROVED_ORIGIN", "");
    const request = visitor();
    expect(await prepareStudioRequest(request)).toBeNull();
    expect(request.headers.get(ACCESS)).toBeNull();
    expect(request.headers.get(BYPASS)).toBeNull();
    expect(request.headers.get("cookie")).toBe("cosmos-client-auth=kept");
  });

  it.each(["/q/x%2f..%2flogin", "/q/..%2flogin", "/q/%5c%5cevil.example"])(
    "stops %s",
    async (path) => {
      expect(await prepareStudioRequest(visitor(path))).toBe(404);
    },
  );

  it("lets ordinary tokens through", async () => {
    expect(await prepareStudioRequest(visitor("/q/AbC-12_x"))).toBeNull();
  });
});
