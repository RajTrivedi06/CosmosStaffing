import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  pairedStudio,
  prepareStudioRequest,
  studioAccessHeaders,
} from "@/lib/studio-access";
import { pairedOrigin } from "@/lib/studio-routes";

const ORIGIN = "https://studio-preview.example";
const ACCESS = "x-vercel-protection-bypass";
const VALUE = "synthetic-only-protection-value";
const OIDC = "x-vercel-trusted-oidc-idp-token";

const visitor = (path = "/q/synthetic") =>
  new NextRequest(`https://site.example${path}`, {
    headers: {
      [ACCESS]: "forged",
      [OIDC]: "forged",
      "x-vercel-set-bypass-cookie": "true",
      "next-action": "kept",
      cookie: "_vercel_jwt=forged; cosmos-client-auth=kept",
    },
  });

beforeEach(() => {
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("STUDIO_APPROVED_ORIGIN", ORIGIN);
  vi.stubEnv("STUDIO_REWRITE_ORIGIN", ORIGIN);
  vi.stubEnv("STUDIO_PROTECTION_BYPASS", VALUE);
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
  it("adds the header only for the approved origin", () => {
    expect(studioAccessHeaders(ORIGIN)).toEqual({ [ACCESS]: VALUE });
    expect(studioAccessHeaders("https://other.example")).toEqual({});
    expect(studioAccessHeaders(`${ORIGIN}/`)).toEqual({});
  });

  it("needs the build's origin to match too", () => {
    vi.stubEnv("STUDIO_REWRITE_ORIGIN", "https://other.example");
    expect(pairedStudio(ORIGIN)).toBe(false);
    expect(studioAccessHeaders(ORIGIN)).toEqual({});
  });

  it.each(["production", "development", ""])("adds nothing on %s", (env) => {
    vi.stubEnv("VERCEL_ENV", env);
    expect(studioAccessHeaders(ORIGIN)).toEqual({});
  });
});

describe("prepareStudioRequest", () => {
  it("replaces what a visitor sent with the server's own credential", () => {
    const request = visitor();
    expect(prepareStudioRequest(request)).toBeNull();
    expect(request.headers.get(ACCESS)).toBe(VALUE);
    expect(request.headers.get(OIDC)).toBeNull();
    expect(request.headers.get("x-vercel-set-bypass-cookie")).toBeNull();
    expect(request.headers.get("next-action")).toBe("kept");
    expect(request.headers.get("cookie")).toBe("cosmos-client-auth=kept");
  });

  it.each([
    ["no approval", { STUDIO_APPROVED_ORIGIN: "" }],
    [
      "a production approval",
      { STUDIO_APPROVED_ORIGIN: "https://studio.cosmosservicesllc.com" },
    ],
    [
      "a build forwarding elsewhere",
      { STUDIO_REWRITE_ORIGIN: "https://other.example" },
    ],
    ["no record of the build's origin", { STUDIO_REWRITE_ORIGIN: "" }],
  ])("forwards nothing from a Preview with %s", (_, env) => {
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    const request = visitor();
    expect(prepareStudioRequest(request)).toBe(503);
    expect(request.headers.get(ACCESS)).toBeNull();
  });

  it.each(["production", ""])("only strips, on %s", (env) => {
    vi.stubEnv("VERCEL_ENV", env);
    vi.stubEnv("STUDIO_APPROVED_ORIGIN", "");
    const request = visitor();
    expect(prepareStudioRequest(request)).toBeNull();
    expect(request.headers.get(ACCESS)).toBeNull();
    expect(request.headers.get(OIDC)).toBeNull();
    expect(request.headers.get("cookie")).toBe("cosmos-client-auth=kept");
  });

  it.each(["/q/x%2f..%2flogin", "/q/..%2flogin", "/q/%5c%5cevil.example"])(
    "stops %s",
    (path) => {
      expect(prepareStudioRequest(visitor(path))).toBe(404);
    },
  );

  it("lets ordinary tokens through", () => {
    expect(prepareStudioRequest(visitor("/q/AbC-12_x"))).toBeNull();
  });
});
