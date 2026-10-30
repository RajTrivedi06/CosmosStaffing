import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { homeQuote } from "./fixtures";

/**
 * /api/quote in customer mode (intake v2) with the session and both
 * destinations mocked. Proves the facade's decisions; not a paired test.
 */
const deliverQuote = vi.fn();
const deliverStudioQuote = vi.fn();
const deliverCustomerQuote = vi.fn();
const session = vi.fn();
const access = vi.fn();
vi.mock("@/lib/quote-delivery", () => ({
  deliverQuote: (...a: unknown[]) => deliverQuote(...a),
}));
vi.mock("@/lib/studio-intake", () => ({
  deliverStudioQuote: (...a: unknown[]) => deliverStudioQuote(...a),
  studioTestConfiguration: () => null,
}));
vi.mock("@/lib/customer-api", async (original) => ({
  ...(await original<typeof import("@/lib/customer-api")>()),
  deliverCustomerQuote: (...a: unknown[]) => deliverCustomerQuote(...a),
}));
vi.mock("@/lib/account/server", () => ({
  clientSession: () => session(),
  verifiedAccess: () => access(),
}));

const ALICE = {
  id: "00000000-0000-4000-8000-0000000000a1",
  email: "alice@example.test",
};
const BOB = {
  id: "00000000-0000-4000-8000-0000000000b2",
  email: "bob@example.test",
};
const ack = {
  ok: true,
  receipt_id: "00000000-0000-4000-8000-000000000202",
  status: "received",
};

let POST: (request: Request) => Promise<Response>;
let ownerTag: (id: string) => string;
let ip = 0;
beforeEach(async () => {
  vi.stubEnv("QUOTE_DELIVERY_MODE", "customer");
  vi.stubEnv("QUOTE_STUDIO_TEST_ENABLED", "true");
  vi.stubEnv(
    "STUDIO_CUSTOMER_API_URL",
    "http://127.0.0.1:3398/api/customer/v2",
  );
  vi.stubEnv("WEBSITE_INTAKE_SECRET", "synthetic-only-intake-secret-0001");
  vi.stubEnv("AUTH_SUPABASE_URL", "http://127.0.0.1:54621");
  vi.stubEnv("AUTH_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_synthetic");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("VERCEL", "");
  vi.resetModules();
  ({ POST } = await import("@/app/api/quote/route"));
  ({ ownerTag } = await import("@/lib/account/owner"));
  for (const mock of [deliverQuote, deliverStudioQuote, deliverCustomerQuote])
    mock.mockReset();
  deliverCustomerQuote.mockResolvedValue({ status: 202, body: ack });
  session.mockResolvedValue({ state: "signed_in", client: ALICE });
  access.mockResolvedValue({ client: ALICE, token: "alice.access.token" });
  ip += 1;
});
afterEach(() => vi.unstubAllEnvs());

const attempt = (patch: object = {}) => ({
  submission_id: crypto.randomUUID(),
  answers: homeQuote,
  version: 2,
  owner: ownerTag(ALICE.id),
  ...patch,
});
const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request("http://localhost/api/quote", {
      method: "POST",
      headers: {
        "x-forwarded-for": `10.1.0.${ip}`,
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    }),
  );
const noDelivery = () => {
  expect(deliverQuote).not.toHaveBeenCalled();
  expect(deliverStudioQuote).not.toHaveBeenCalled();
  expect(deliverCustomerQuote).not.toHaveBeenCalled();
};

describe("customer intake through /api/quote", () => {
  it("sends this client's v2 attempt with their server-side token, to v2 only", async () => {
    const body = attempt();
    const res = await post(body, {
      // Browser-supplied identity and credentials are ignored.
      authorization: "Bearer forged",
      cookie: "cosmos-client-auth=forged",
    });
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual(ack);
    expect(deliverCustomerQuote).toHaveBeenCalledExactlyOnceWith(
      { submission_id: body.submission_id, answers: homeQuote },
      "alice.access.token",
    );
    expect(deliverQuote).not.toHaveBeenCalled();
    expect(deliverStudioQuote).not.toHaveBeenCalled();
  });

  it.each([
    ["no auth configuration", { AUTH_SUPABASE_URL: "" }],
    ["no customer API configuration", { STUDIO_CUSTOMER_API_URL: "" }],
    ["Vercel Production", { VERCEL_ENV: "production" }],
  ])("fails closed with %s and never falls back to legacy", async (_, env) => {
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    vi.resetModules();
    ({ POST } = await import("@/app/api/quote/route"));
    const res = await post(attempt());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, code: "studio_pending" });
    noDelivery();
  });

  it.each(["signed_out", "expired"])(
    "asks a %s client to sign in",
    async (state) => {
      session.mockResolvedValue({ state });
      access.mockResolvedValue(null);
      const res = await post(attempt());
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({
        ok: false,
        code: "sign_in_required",
      });
      noDelivery();
    },
  );

  it("refuses when no verified token is available", async () => {
    access.mockResolvedValue(null);
    expect((await post(attempt())).status).toBe(401);
    noDelivery();
  });

  it("never sends another account's attempt as this one", async () => {
    session.mockResolvedValue({ state: "signed_in", client: BOB });
    access.mockResolvedValue({ client: BOB, token: "bob.access.token" });
    const res = await post(attempt());
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, code: "account_mismatch" });
    noDelivery();
  });

  it.each([
    ["a v1 attempt (no version)", { version: undefined }],
    ["an attempt with no owner", { owner: undefined }],
    ["a forged identity field", { client_id: ALICE.id }],
    ["a forged user field", { user_id: ALICE.id }],
  ])("rejects %s", async (_, patch) => {
    const res = await post(attempt(patch));
    expect(res.status).toBe(422);
    noDelivery();
  });

  it("passes Studio's outcomes through without claiming success", async () => {
    for (const [status, code] of [
      [409, "idempotency_conflict"],
      [403, "email_unverified"],
      [502, "delivery_failed"],
      // Operational: the client keeps their session and attempt.
      [503, "unavailable"],
    ] as const) {
      deliverCustomerQuote.mockResolvedValueOnce({
        status,
        body: { ok: false, code },
      });
      const res = await post(attempt());
      expect(res.status).toBe(status);
      expect(await res.json()).toEqual({ ok: false, code });
    }
  });
});

describe("legacy mode stays as it was", () => {
  it("never sends a v2 attempt to the legacy inbox", async () => {
    vi.stubEnv("QUOTE_DELIVERY_MODE", "legacy");
    vi.resetModules();
    ({ POST } = await import("@/app/api/quote/route"));
    const res = await post(attempt());
    expect(res.status).toBe(422);
    noDelivery();
  });

  it("still refuses another account's attempt", async () => {
    vi.stubEnv("QUOTE_DELIVERY_MODE", "legacy");
    vi.resetModules();
    ({ POST } = await import("@/app/api/quote/route"));
    session.mockResolvedValue({ state: "signed_in", client: BOB });
    const res = await post(attempt({ version: undefined }));
    expect(res.status).toBe(409);
    noDelivery();
  });
});
