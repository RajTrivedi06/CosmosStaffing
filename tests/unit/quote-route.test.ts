import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { homeQuote } from "./fixtures";

const deliverQuote = vi.fn();
vi.mock("@/lib/quote-delivery", () => ({
  deliverQuote: (...args: unknown[]) => deliverQuote(...args),
}));

// The route keeps its rate limit in module state, so each test gets a fresh
// copy and its own client address.
let POST: (request: Request) => Promise<Response>;
let ip = 0;
beforeEach(async () => {
  vi.stubEnv("QUOTE_DELIVERY_MODE", "legacy");
  vi.resetModules();
  ({ POST } = await import("@/app/api/quote/route"));
  deliverQuote.mockReset();
  deliverQuote.mockResolvedValue({
    outcome: "sent",
    stored: "ok",
    emailed: "ok",
  });
  ip += 1;
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => vi.unstubAllEnvs());

const post = (body: unknown, from = `10.0.0.${ip}`) =>
  POST(
    new Request("http://localhost/api/quote", {
      method: "POST",
      headers: { "x-forwarded-for": from, "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

describe("POST /api/quote", () => {
  it("delivers a valid request", async () => {
    const res = await post(homeQuote);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
    expect(deliverQuote).toHaveBeenCalledOnce();
  });

  it("rejects malformed JSON", async () => {
    expect((await post("{not json")).status).toBe(400);
  });

  it("rejects an oversized body", async () => {
    const res = await post({ ...homeQuote, notes: "x".repeat(20_000) });
    expect(res.status).toBe(413);
    expect(deliverQuote).not.toHaveBeenCalled();
  });

  it("re-validates every answer on the server", async () => {
    const res = await post({ ...homeQuote, email: "not-an-email" });
    expect(res.status).toBe(422);
    expect(deliverQuote).not.toHaveBeenCalled();
  });

  it("does not acknowledge dropped honeypot requests as persisted", async () => {
    const res = await post({ ...homeQuote, website: "http://spam.test" });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ ok: false });
    expect(deliverQuote).not.toHaveBeenCalled();
  });

  it("limits each address to five requests per window", async () => {
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await post(homeQuote)).status);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it("says so honestly when delivery is not set up", async () => {
    deliverQuote.mockResolvedValue({
      outcome: "not_configured",
      stored: "not_configured",
      emailed: "not_configured",
    });
    const res = await post(homeQuote);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, code: "not_configured" });
  });

  it("reports a delivery failure", async () => {
    deliverQuote.mockResolvedValue({
      outcome: "failed",
      stored: "failed",
      emailed: "failed",
    });
    expect((await post(homeQuote)).status).toBe(502);
  });

  it("never logs customer details", async () => {
    const info = vi.mocked(console.info);
    await post(homeQuote);
    const logged = info.mock.calls.flat().join(" ");
    expect(logged).not.toContain("alex@example.com");
    expect(logged).not.toContain("Alex");
    expect(logged).not.toContain("78701");
  });
});

it("blocks Studio cutover without falling back to legacy or accepting unverified clients", async () => {
  vi.stubEnv("QUOTE_DELIVERY_MODE", "studio");
  const res = await post(homeQuote);
  expect(res.status).toBe(503);
  expect(res.headers.get("cache-control")).toBe("no-store");
  expect(await res.json()).toEqual({ ok: false, code: "studio_pending" });
  expect(deliverQuote).not.toHaveBeenCalled();
});

describe("POST /api/quote with client accounts on", () => {
  const session = vi.fn();
  beforeEach(async () => {
    vi.doMock("@/lib/account/server", () => ({
      clientSession: () => session(),
    }));
    vi.resetModules();
    ({ POST } = await import("@/app/api/quote/route"));
  });
  afterEach(() => vi.doUnmock("@/lib/account/server"));

  it.each(["signed_out", "expired"])(
    "asks a %s client to sign in and sends nothing",
    async (state) => {
      session.mockResolvedValue({ state });
      const res = await post(homeQuote);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ ok: false, code: "sign_in_required" });
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(deliverQuote).not.toHaveBeenCalled();
    },
  );

  it("sends for a verified, signed-in client", async () => {
    session.mockResolvedValue({
      state: "signed_in",
      client: { id: "u1", email: "alex@example.com" },
    });
    expect((await post(homeQuote)).status).toBe(200);
    expect(deliverQuote).toHaveBeenCalledOnce();
  });
});

describe("POST /api/quote origin check", () => {
  const from = (origin: string, host: string) =>
    POST(
      new Request("http://localhost:3201/api/quote", {
        method: "POST",
        headers: {
          origin,
          host,
          "x-forwarded-for": `10.9.0.${++ip}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(homeQuote),
      }),
    );

  it("accepts the host the browser actually used", async () => {
    // Next may report 127.0.0.1 as localhost in request.url.
    expect((await from("http://127.0.0.1:3201", "127.0.0.1:3201")).status).toBe(
      200,
    );
  });

  it("still refuses another site", async () => {
    expect((await from("https://evil.example", "127.0.0.1:3201")).status).toBe(
      403,
    );
    expect(deliverQuote).not.toHaveBeenCalled();
  });
});
