import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  customerApiConfig,
  deliverCustomerQuote,
  readAccount,
  readRequest,
  readRequests,
  safeCursor,
} from "@/lib/customer-api";
import {
  customerIntakeSchema,
  requestDetailSchema,
} from "@/lib/customer-api-contract";
import { createQuoteAttempt, toStudioIntake } from "@/lib/quote-attempt";
import { homeQuote, officeQuote } from "./fixtures";
import { websiteIntakeFixture } from "./studio-intake-fixture";

/**
 * The website's customer API v2 adapter against a stubbed fetch: mocked
 * Studio answers, not a paired test. Paired evidence needs one isolated
 * Supabase project shared with a running Studio.
 */
const realFetch = globalThis.fetch;
const SECRET = "synthetic-only-intake-secret-0001";
const BASE = "http://127.0.0.1:3398/api/customer/v2";
const TOKEN = "synthetic.access.token";
const ack = {
  ok: true,
  receipt_id: "00000000-0000-4000-8000-000000000202",
  status: "received",
};
const attempt = {
  submission_id: "00000000-0000-4000-8000-000000000301",
  answers: websiteIntakeFixture.answers,
};

type Seen = { url: string; init: RequestInit };
const seen: Seen[] = [];
function studio(status: number, body: unknown) {
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    seen.push({ url, init });
    return new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  });
}

beforeEach(() => {
  seen.length = 0;
  vi.stubEnv("QUOTE_STUDIO_TEST_ENABLED", "true");
  vi.stubEnv("STUDIO_CUSTOMER_API_URL", BASE);
  vi.stubEnv("WEBSITE_INTAKE_SECRET", SECRET);
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("VERCEL", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("configuration", () => {
  it("accepts an explicit isolated loopback endpoint", () => {
    expect(customerApiConfig()).toEqual({ base: BASE, secret: SECRET });
  });

  it.each([
    ["Vercel Production", { VERCEL_ENV: "production" }],
    ["no explicit test gate", { QUOTE_STUDIO_TEST_ENABLED: "" }],
    ["a short secret", { WEBSITE_INTAKE_SECRET: "short" }],
    [
      "the wrong path",
      { STUDIO_CUSTOMER_API_URL: "http://127.0.0.1:3398/api" },
    ],
    [
      "the v1 webhook",
      { STUDIO_CUSTOMER_API_URL: "http://127.0.0.1:3398/api/webhooks/website" },
    ],
    ["a query string", { STUDIO_CUSTOMER_API_URL: `${BASE}?x=1` }],
    [
      "credentials in the URL",
      { STUDIO_CUSTOMER_API_URL: "http://u:p@127.0.0.1:3398/api/customer/v2" },
    ],
    [
      "a non-loopback host locally",
      { STUDIO_CUSTOMER_API_URL: "http://studio.example/api/customer/v2" },
    ],
    [
      "plain HTTP on a Preview",
      {
        VERCEL_ENV: "preview",
        STUDIO_CUSTOMER_API_URL: "http://studio.example/api/customer/v2",
      },
    ],
    [
      "the company domain",
      {
        VERCEL_ENV: "preview",
        STUDIO_CUSTOMER_API_URL:
          "https://studio.cosmosservicesllc.com/api/customer/v2",
      },
    ],
  ])("is off with %s", (_, env) => {
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    expect(customerApiConfig()).toBeNull();
  });

  it("accepts the approved HTTPS Preview endpoint", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("STUDIO_APPROVED_ORIGIN", "https://studio-preview.example");
    vi.stubEnv("STUDIO_REWRITE_ORIGIN", "https://studio-preview.example");
    vi.stubEnv(
      "STUDIO_CUSTOMER_API_URL",
      "https://studio-preview.example/api/customer/v2",
    );
    expect(customerApiConfig()?.base).toBe(
      "https://studio-preview.example/api/customer/v2",
    );
  });
});

describe("protected Preview access", () => {
  const ORIGIN = "https://studio-preview.example";
  const PREVIEW_API = `${ORIGIN}/api/customer/v2`;
  const ACCESS = "x-vercel-protection-bypass";
  const VALUE = "synthetic-only-protection-value";
  const sent = async () => {
    studio(200, { ok: true, linked: false });
    await readAccount(TOKEN);
    return seen.at(-1)?.init.headers as Record<string, string>;
  };
  beforeEach(() => {
    seen.length = 0;
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("STUDIO_CUSTOMER_API_URL", PREVIEW_API);
    vi.stubEnv("STUDIO_APPROVED_ORIGIN", ORIGIN);
    vi.stubEnv("STUDIO_REWRITE_ORIGIN", ORIGIN);
    vi.stubEnv("STUDIO_PROTECTION_BYPASS", VALUE);
  });

  it("sends the credential to the approved origin", async () => {
    const headers = await sent();
    expect(headers[ACCESS]).toBe(VALUE);
    expect(seen.at(-1)?.url.startsWith(`${ORIGIN}/`)).toBe(true);
    expect(seen.at(-1)?.init.redirect).toBe("error");
  });

  it("sends no bypass without the variable, and still reaches the Studio", async () => {
    vi.stubEnv("STUDIO_PROTECTION_BYPASS", "");
    expect(await sent()).not.toHaveProperty(ACCESS);
    expect(seen).toHaveLength(1);
  });

  // None of these may get the bypass, the service secret or a customer's token.
  it.each([
    ["no approval", { STUDIO_APPROVED_ORIGIN: "" }],
    [
      "a different API host",
      { STUDIO_CUSTOMER_API_URL: "https://other.example/api/customer/v2" },
    ],
    [
      "an API host differing only by subdomain",
      {
        STUDIO_CUSTOMER_API_URL:
          "https://x.studio-preview.example/api/customer/v2",
      },
    ],
    [
      "an API host on another port",
      { STUDIO_CUSTOMER_API_URL: `${ORIGIN}:8443/api/customer/v2` },
    ],
    [
      "a build forwarding elsewhere",
      { STUDIO_REWRITE_ORIGIN: "https://other.example" },
    ],
    ["no record of the build's origin", { STUDIO_REWRITE_ORIGIN: "" }],
    [
      "an approval with a trailing slash",
      { STUDIO_APPROVED_ORIGIN: `${ORIGIN}/` },
    ],
    [
      "an approval with capitals",
      { STUDIO_APPROVED_ORIGIN: "https://Studio-Preview.example" },
    ],
    [
      "an approval with a default port",
      { STUDIO_APPROVED_ORIGIN: `${ORIGIN}:443` },
    ],
    ["an approval with a path", { STUDIO_APPROVED_ORIGIN: `${ORIGIN}/api` }],
    [
      "an approval over HTTP",
      { STUDIO_APPROVED_ORIGIN: "http://studio-preview.example" },
    ],
    ["a wildcard approval", { STUDIO_APPROVED_ORIGIN: "https://*.vercel.app" }],
    [
      "the production Studio",
      {
        STUDIO_APPROVED_ORIGIN: "https://studio.cosmosservicesllc.com",
        STUDIO_REWRITE_ORIGIN: "https://studio.cosmosservicesllc.com",
        STUDIO_CUSTOMER_API_URL:
          "https://studio.cosmosservicesllc.com/api/customer/v2",
      },
    ],
    [
      "the Studio project's production alias",
      {
        STUDIO_APPROVED_ORIGIN: "https://internal-tools-cosmos.vercel.app",
        STUDIO_REWRITE_ORIGIN: "https://internal-tools-cosmos.vercel.app",
        STUDIO_CUSTOMER_API_URL:
          "https://internal-tools-cosmos.vercel.app/api/customer/v2",
      },
    ],
  ])("sends nothing with %s", async (_, env) => {
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    expect(customerApiConfig()).toBeNull();
    await sent();
    expect(seen).toHaveLength(0);
  });

  it("ignores the variable in Vercel Production", async () => {
    const api = "https://studio.cosmosservicesllc.com/api/customer/v2";
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("CUSTOMER_API_PRODUCTION_ENABLED", "true");
    vi.stubEnv("STUDIO_CUSTOMER_API_URL", api);
    vi.stubEnv(
      "STUDIO_APPROVED_ORIGIN",
      "https://studio.cosmosservicesllc.com",
    );
    expect(await sent()).not.toHaveProperty(ACCESS);
    expect(seen).toHaveLength(1);
  });

  it("follows no redirect, so nothing reaches another host", async () => {
    const landed: IncomingHttpHeaders[] = [];
    const servers = [
      createServer((req, res) => {
        landed.push(req.headers);
        res.end("{}");
      }),
      createServer((req, res) => {
        const { port } = servers[0].address() as AddressInfo;
        res.writeHead(307, { location: `http://127.0.0.1:${port}/landed` });
        res.end();
      }),
    ];
    for (const server of servers)
      await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    const { port } = servers[1].address() as AddressInfo;
    // The real fetch, with the approved origin answered by a redirecting server.
    vi.stubGlobal("fetch", (url: string, init: RequestInit) =>
      realFetch(url.replace(ORIGIN, `http://127.0.0.1:${port}`), init),
    );
    const result = await readAccount(TOKEN);
    for (const server of servers) server.close();
    expect(result).toEqual({ ok: false, reason: "unavailable" });
    expect(landed).toHaveLength(0);
  });
});

describe("production", () => {
  const PRODUCTION = "https://studio.cosmosservicesllc.com/api/customer/v2";
  beforeEach(() => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("STUDIO_CUSTOMER_API_URL", PRODUCTION);
  });

  it("stays off by default, even with the test switch and the real address", () => {
    vi.stubEnv("QUOTE_STUDIO_TEST_ENABLED", "true");
    vi.stubEnv("CUSTOMER_API_PRODUCTION_ENABLED", "");
    expect(customerApiConfig()).toBeNull();
  });

  it("opens only with its own switch and the real Studio", () => {
    vi.stubEnv("QUOTE_STUDIO_TEST_ENABLED", "");
    vi.stubEnv("CUSTOMER_API_PRODUCTION_ENABLED", "true");
    expect(customerApiConfig()).toEqual({ base: PRODUCTION, secret: SECRET });
  });

  it.each([
    ["a loopback address", "http://127.0.0.1:3398/api/customer/v2"],
    ["another host", "https://studio.example.test/api/customer/v2"],
    ["the wrong path", "https://studio.cosmosservicesllc.com/api/customer"],
    ["plain HTTP", "http://studio.cosmosservicesllc.com/api/customer/v2"],
    ["no address", ""],
  ])("refuses %s even when switched on", (_, url) => {
    vi.stubEnv("CUSTOMER_API_PRODUCTION_ENABLED", "true");
    vi.stubEnv("STUDIO_CUSTOMER_API_URL", url);
    expect(customerApiConfig()).toBeNull();
  });

  it("needs a real server credential", () => {
    vi.stubEnv("CUSTOMER_API_PRODUCTION_ENABLED", "true");
    vi.stubEnv("WEBSITE_INTAKE_SECRET", "short");
    expect(customerApiConfig()).toBeNull();
  });

  it("the production switch doesn't open a Preview", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("QUOTE_STUDIO_TEST_ENABLED", "");
    vi.stubEnv("CUSTOMER_API_PRODUCTION_ENABLED", "true");
    expect(customerApiConfig()).toBeNull();
  });
});

describe("intake v2", () => {
  it("sends exactly {version 2, submission_id, answers} with the documented headers", async () => {
    studio(202, ack);
    const result = await deliverCustomerQuote(attempt, TOKEN);
    expect(result).toEqual({ status: 202, body: ack });
    expect(seen).toHaveLength(1);
    const [{ url, init }] = seen;
    expect(url).toBe(`${BASE}/intake`);
    expect(init.method).toBe("POST");
    expect(init.redirect).toBe("error");
    expect(init.headers).toEqual({
      Accept: "application/json",
      Authorization: `Bearer ${TOKEN}`,
      "X-Webhook-Secret": SECRET,
      "Content-Type": "application/json",
      "Idempotency-Key": attempt.submission_id,
    });
    const body = JSON.parse(String(init.body));
    expect(body).toEqual({
      version: 2,
      submission_id: attempt.submission_id,
      answers: websiteIntakeFixture.answers,
    });
    // No identity of any kind in the body; the bearer token is the identity.
    expect(body).not.toHaveProperty("identity");
    expect(JSON.stringify(body)).not.toMatch(/user_id|client_id|customer/);
  });

  it("maps every website answer branch through the v2 schema", () => {
    for (const answers of [homeQuote, officeQuote]) {
      const payload = {
        version: 2,
        ...(({ submission_id, answers: a }) => ({ submission_id, answers: a }))(
          toStudioIntake(createQuoteAttempt(answers)),
        ),
      };
      expect(customerIntakeSchema.safeParse(payload).success).toBe(true);
    }
  });

  it("treats an identical replay (200) as the same committed receipt", async () => {
    studio(200, ack);
    expect(await deliverCustomerQuote(attempt, TOKEN)).toEqual({
      status: 200,
      body: ack,
    });
  });

  it.each([
    [401, { ok: false, code: "unauthorized" }, 401, "sign_in_required"],
    [403, { ok: false, code: "email_unverified" }, 403, "email_unverified"],
    [
      409,
      { ok: false, code: "idempotency_conflict" },
      409,
      "idempotency_conflict",
    ],
    [422, { ok: false, code: "invalid" }, 422, "invalid"],
    [413, { ok: false, code: "too_large" }, 413, "too_large"],
    [503, { ok: false, code: "unavailable" }, 503, "unavailable"],
    // Contract 2.2: a refused server credential is never the client's problem.
    [503, { ok: false, code: "service_auth_failed" }, 503, "unavailable"],
    // Only Studio's exact answer means the session failed.
    [401, { ok: false, code: "something_else" }, 503, "unavailable"],
    [401, "<html>Protected preview</html>", 503, "unavailable"],
    // Success status without a valid committed acknowledgment: unknown outcome.
    [202, { ok: true }, 502, "delivery_failed"],
    [200, { ok: true, id: "not-a-receipt" }, 502, "delivery_failed"],
    [202, { ...ack, status: "booked" }, 502, "delivery_failed"],
    [200, { ...ack, receipt_id: "not-a-uuid" }, 502, "delivery_failed"],
    [404, { ok: false, code: "not_found" }, 502, "delivery_failed"],
    [500, "oops", 502, "delivery_failed"],
  ])("maps Studio %i to %i %s", async (status, body, mapped, code) => {
    studio(status, body);
    expect(await deliverCustomerQuote(attempt, TOKEN)).toEqual({
      status: mapped,
      body: { ok: false, code },
    });
  });

  it("keeps a lost response retryable", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("network down");
    });
    expect(await deliverCustomerQuote(attempt, TOKEN)).toEqual({
      status: 502,
      body: { ok: false, code: "delivery_failed" },
    });
  });

  it("sends nothing when the adapter is off", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    studio(202, ack);
    expect(await deliverCustomerQuote(attempt, TOKEN)).toEqual({
      status: 503,
      body: { ok: false, code: "studio_pending" },
    });
    expect(seen).toHaveLength(0);
  });
});

describe("account reads", () => {
  const summary = {
    request_id: "00000000-0000-4000-8000-000000000401",
    job_number: 1001,
    submitted_at: "2026-10-30T14:02:11.5+00:00",
    sales_status: "quoted",
    service_status: "unassigned",
    scheduled_start_at: null,
    scheduled_end_at: null,
    quote_accepted: false,
    payment_status: "unpaid",
  };

  it("reads the account with the bearer token and no body", async () => {
    const account = {
      user_id: "00000000-0000-4000-8000-000000000099",
      email: "a@example.test",
      linked: false,
    };
    studio(200, { ok: true, account });
    expect(await readAccount(TOKEN)).toEqual({ ok: true, data: account });
    expect(seen[0].url).toBe(`${BASE}/account`);
    expect(seen[0].init.method).toBe("GET");
    expect(seen[0].init.body).toBeUndefined();
  });

  it("pages requests with Studio's opaque cursor", async () => {
    const cursor =
      "2026-10-30 14:02:11.5+00|00000000-0000-4000-8000-000000000401";
    studio(200, { ok: true, items: [summary], next_cursor: null });
    expect(await readRequests(TOKEN, cursor)).toEqual({
      ok: true,
      data: { items: [summary], next_cursor: null },
    });
    expect(new URL(seen[0].url).searchParams.get("cursor")).toBe(cursor);
    expect(new URL(seen[0].url).searchParams.get("limit")).toBe("20");
  });

  it("treats missing and someone else's request alike", async () => {
    studio(404, { ok: false, code: "not_found" });
    expect(
      await readRequest(TOKEN, "00000000-0000-4000-8000-000000000402"),
    ).toEqual({ ok: false, reason: "not_found" });
    // A malformed ID never reaches Studio.
    seen.length = 0;
    expect(await readRequest(TOKEN, "../account")).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(seen).toHaveLength(0);
  });

  it.each([
    [401, { ok: false, code: "unauthorized" }, "unauthorized"],
    [403, { ok: false, code: "email_unverified" }, "unverified"],
    [503, { ok: false, code: "unavailable" }, "unavailable"],
    [503, { ok: false, code: "service_auth_failed" }, "unavailable"],
    [401, { ok: false, code: "something_else" }, "unavailable"],
    [401, "<html>Protected preview</html>", "unavailable"],
    [200, { ok: true, items: "nope" }, "unavailable"],
  ])("maps %i to %s", async (status, body, reason) => {
    studio(status, body);
    expect(await readRequests(TOKEN, null)).toEqual({ ok: false, reason });
  });

  it("only passes Studio-shaped cursors", () => {
    expect(
      safeCursor(
        "2026-10-30 14:02:11.5+00|00000000-0000-4000-8000-000000000401",
      ),
    ).not.toBeNull();
    for (const bad of [
      "",
      "x|y",
      "2026-10-30|not-a-uuid",
      "javascript:alert(1)|00000000-0000-4000-8000-000000000401",
      ["2026"],
    ])
      expect(safeCursor(bad)).toBeNull();
  });
});

// Optional source conformance check against the Studio implementation
// worktree; not an HTTP or database integration test. The Studio's schema
// imports its own "@/features/…" path, which can't resolve from here, so the
// test reads a copy (in node_modules/.cache, never the Studio's worktree)
// pointed at the Studio's real v1 schema file.
const root =
  process.env.STUDIO_IMPLEMENTATION_ROOT ||
  path.resolve(process.cwd(), "../wt-integration-implementation");
const features = `${root}/apps/operations-studio/src/features`;
async function studioModule(file: string) {
  const source = readFileSync(`${features}/customer-api/${file}`, "utf8")
    .replaceAll(
      '"@/features/website-intake/schema"',
      JSON.stringify(`${features}/website-intake/schema.ts`),
    )
    .replaceAll(
      '"@/features/website-intake/fixtures"',
      JSON.stringify(`${features}/website-intake/fixtures.ts`),
    );
  expect(source).not.toMatch(/from "@\//);
  const dir = path.resolve("node_modules/.cache/studio-conformance");
  mkdirSync(dir, { recursive: true });
  const copy = `${dir}/${file}`;
  writeFileSync(copy, source);
  return import(/* @vite-ignore */ copy);
}

it.skipIf(!existsSync(`${features}/customer-api/schema.ts`))(
  "matches the Studio's customer API schemas and fixture",
  async () => {
    const canonical = await studioModule("schema.ts");
    const fixtures = await studioModule("fixtures.ts");
    const fixture = fixtures.customerIntakeFixture;
    const examples = [
      fixture,
      { ...fixture, version: 1 },
      { ...fixture, identity: { status: "verified" } },
      { ...fixture, answers: { ...fixture.answers, customer_id: "forged" } },
      {
        version: 2,
        submission_id: attempt.submission_id,
        answers: toStudioIntake(createQuoteAttempt(officeQuote)).answers,
      },
    ];
    for (const example of examples) {
      const ours = customerIntakeSchema.safeParse(example);
      const theirs = canonical.customerIntakeSchema.safeParse(example);
      expect(ours.success).toBe(theirs.success);
    }
    const detail = {
      request_id: "00000000-0000-4000-8000-000000000401",
      job_number: 1001,
      submitted_at: "2026-10-30T14:02:11.5+00:00",
      sales_status: "quoted",
      service_status: "unassigned",
      scheduled_start_at: null,
      scheduled_end_at: null,
      quote_accepted: false,
      payment_status: "unpaid",
      answers: fixture.answers,
      quotes: [],
      quotes_has_more: false,
      payment_requests: [],
      payment_requests_has_more: false,
    };
    for (const example of [detail, { ...detail, extra: 1 }])
      expect(requestDetailSchema.safeParse(example).success).toBe(
        canonical.requestDetailSchema.safeParse(example).success,
      );
  },
);
