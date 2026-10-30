import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { websiteIntakeFixture as fixture } from "./studio-intake-fixture";
import { websiteIntakeSchema } from "@/lib/studio-intake-contract";
import {
  confirmedQuote,
  createQuoteAttempt,
  readQuoteAttempt,
  toStudioIntake,
} from "@/lib/quote-attempt";
import {
  deliverStudioQuote,
  studioTestConfiguration,
} from "@/lib/studio-intake";
import { homeQuote, officeQuote } from "./fixtures";

const secret = "synthetic-only-intake-secret-0001";
const ack = {
  ok: true,
  receipt_id: "00000000-0000-4000-8000-000000000202",
  status: "received",
};
const attempt = {
  submission_id: fixture.submission_id,
  answers: fixture.answers,
};
const deliverQuote = vi.fn();
vi.mock("@/lib/quote-delivery", () => ({
  deliverQuote: (...args: unknown[]) => deliverQuote(...args),
}));

beforeEach(() => {
  vi.stubEnv("QUOTE_DELIVERY_MODE", "studio");
  vi.stubEnv("QUOTE_STUDIO_TEST_ENABLED", "true");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("STUDIO_INTAKE_URL", "http://127.0.0.1:3398/api/webhooks/website");
  vi.stubEnv("WEBSITE_INTAKE_SECRET", secret);
  deliverQuote.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("maps the canonical synthetic fixture exactly", () => {
  expect(toStudioIntake(attempt)).toEqual(fixture);
});
it("preserves ranges and omits inactive branch fields without altering the raw snapshot", () => {
  const raw = {
    ...officeQuote,
    bedrooms: "5+",
    bathrooms: "4+",
    date: "2026-12-01",
  };
  const snapshot = createQuoteAttempt(raw);
  const payload = toStudioIntake(snapshot);
  expect(payload.answers).not.toHaveProperty("bedrooms");
  expect(payload.answers.area).toBe("1500-4000");
  expect(snapshot.answers.bedrooms).toBe("5+");
  expect(websiteIntakeSchema.safeParse(payload).success).toBe(true);
  const oneOff = toStudioIntake(
    createQuoteAttempt({ ...homeQuote, service: "deep", date: "not-active" }),
  );
  expect(oneOff.answers).not.toHaveProperty("frequency");
  expect(oneOff.answers).not.toHaveProperty("date");
});
it("requires email and phone even though the upstream permits an empty phone", () => {
  expect(
    websiteIntakeSchema.safeParse({
      ...fixture,
      answers: { ...fixture.answers, phone: "" },
    }).success,
  ).toBe(true);
  for (const key of ["email", "phone"] as const)
    expect(() =>
      toStudioIntake({
        ...attempt,
        answers: { ...attempt.answers, [key]: "" },
      }),
    ).toThrow();
});
it("detaches the submitted snapshot and restores its unchanged UUID/answers", () => {
  const draft = structuredClone(homeQuote);
  const snapshot = createQuoteAttempt(draft);
  draft.extras.push("oven");
  draft.name = "Changed";
  expect(snapshot.answers).toEqual(homeQuote);
  expect(readQuoteAttempt(JSON.stringify(snapshot))).toEqual(snapshot);
  expect(readQuoteAttempt('{"submission_id":"broken"}')).toBeNull();
});
it.each([200, 202])(
  "accepts only the committed acknowledgment (%s)",
  async (status) => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(ack, { status }));
    vi.stubGlobal("fetch", fetcher);
    expect(await deliverStudioQuote(attempt)).toEqual({ status, body: ack });
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:3398/api/webhooks/website");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      "X-Webhook-Secret": secret,
      "Idempotency-Key": fixture.submission_id,
    });
    expect(init.redirect).toBe("error");
    expect(init.cache).toBe("no-store");
    expect(JSON.parse(init.body)).toEqual(fixture);
  },
);
it.each([
  [200, { ok: true }],
  [202, { ok: true, id: "email-delivered" }],
  [200, { ...ack, receipt_id: "invalid" }],
  [200, { ...ack, status: "queued" }],
  [201, ack],
  [204, null],
  [200, { ...ack, extra: true }],
])(
  "rejects malformed/uncommitted acknowledgment %s %j",
  async (status, body) => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          status === 204
            ? new Response(null, { status })
            : Response.json(body, { status }),
        ),
    );
    expect((await deliverStudioQuote(attempt)).status).toBe(502);
  },
);
it.each([
  [409, "idempotency_conflict", 409, "idempotency_conflict"],
  [401, "unauthorized", 503, "unavailable"],
  [503, "unavailable", 503, "unavailable"],
  [422, "invalid", 422, "invalid"],
  [413, "too_large", 413, "too_large"],
])(
  "maps upstream %s without credentials or details",
  async (status, code, expectedStatus, expectedCode) => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ ok: false, code, details: secret }, { status }),
        ),
    );
    expect(await deliverStudioQuote(attempt)).toEqual({
      status: expectedStatus,
      body: { ok: false, code: expectedCode },
    });
  },
);
it("keeps transport failure ambiguous", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error(secret)));
  expect(await deliverStudioQuote(attempt)).toEqual({
    status: 502,
    body: { ok: false, code: "delivery_failed" },
  });
});
it("never treats a receipt as success on a failed status", () => {
  expect(confirmedQuote(502, ack)).toBe(false);
  expect(confirmedQuote(202, ack)).toBe(true);
  expect(confirmedQuote(200, { ok: true, id: "legacy" })).toBe(true);
  expect(confirmedQuote(202, { ok: true, id: "legacy" })).toBe(false);
  // Customer intake: only the Studio's receipt completes a request.
  expect(confirmedQuote(202, ack, true)).toBe(true);
  expect(confirmedQuote(200, ack, true)).toBe(true);
  expect(confirmedQuote(200, { ok: true, id: "legacy" }, true)).toBe(false);
});
it.each([
  "https://studio.cosmosservicesllc.com/api/webhooks/website",
  "https://example.com/api/webhooks/website",
  "http://127.0.0.1:3398/api/other",
  "http://u:p@127.0.0.1:3398/api/webhooks/website",
  "http://127.0.0.1:3398/api/webhooks/website?token=x",
])("rejects unsafe/nonisolated target %s", (url) => {
  vi.stubEnv("STUDIO_INTAKE_URL", url);
  expect(studioTestConfiguration()).toBeNull();
});
it("requires explicit preview configuration and always blocks Production", () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv(
    "STUDIO_INTAKE_URL",
    "https://isolated-studio.example.test/api/webhooks/website",
  );
  expect(studioTestConfiguration()).not.toBeNull();
  vi.stubEnv("VERCEL_ENV", "production");
  expect(studioTestConfiguration()).toBeNull();
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("QUOTE_STUDIO_TEST_ENABLED", "false");
  expect(studioTestConfiguration()).toBeNull();
});

describe("website facade with a synthetic upstream (not database verification)", () => {
  let POST: (request: Request) => Promise<Response>;
  beforeEach(async () => {
    vi.resetModules();
    ({ POST } = await import("@/app/api/quote/route"));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json(ack, { status: 202 })),
    );
  });
  const req = (body: unknown = attempt, headers: Record<string, string> = {}) =>
    new Request("http://localhost:3397/api/quote", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  it("passes exact contract with no forwarded credentials and never writes legacy", async () => {
    const res = await POST(
      req(attempt, {
        cookie: "private",
        authorization: "Bearer private",
        host: "evil.test",
        "x-forwarded-host": "evil.test",
      }),
    );
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual(ack);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("cdn-cache-control")).toBe("no-store");
    expect(deliverQuote).not.toHaveBeenCalled();
    expect(Object.keys(vi.mocked(fetch).mock.calls[0][1]!.headers!)).toEqual([
      "Content-Type",
      "X-Webhook-Secret",
      "Idempotency-Key",
    ]);
  });
  it("sends identical UUID/content for concurrent retries; forwards conflict without minting an ID", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(async () => Response.json(ack, { status: 200 })),
    );
    const responses = await Promise.all([POST(req()), POST(req())]);
    expect(await Promise.all(responses.map((r) => r.json()))).toEqual([
      ack,
      ack,
    ]);
    const bodies = vi.mocked(fetch).mock.calls.map((call) => call[1]!.body);
    expect(bodies[0]).toBe(bodies[1]);
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json(
        { ok: false, code: "idempotency_conflict" },
        { status: 409 },
      ),
    );
    expect(
      (
        await POST(
          req({
            ...attempt,
            answers: { ...attempt.answers, notes: "Changed" },
          }),
        )
      ).status,
    ).toBe(409);
    expect(deliverQuote).not.toHaveBeenCalled();
  });
  it.each([
    { ...attempt, identity: { status: "pending" } },
    { ...attempt, answers: { ...attempt.answers, user_id: "forged" } },
    { ...attempt, answers: { ...attempt.answers, phone: "" } },
    { ...attempt, submission_id: "bad" },
    { ...attempt, website: "spam" },
  ])("rejects invalid/privileged browser input", async (body) => {
    expect((await POST(req(body))).status).toBe(422);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("enforces byte limits for multibyte input with a false Content-Length", async () => {
    expect(
      (
        await POST(
          req(
            {
              ...attempt,
              answers: { ...attempt.answers, notes: "😀".repeat(4100) },
            },
            { "content-length": "1" },
          ),
        )
      ).status,
    ).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects invalid UTF-8 and chunked oversize", async () => {
    const stream = (parts: Uint8Array[]) =>
      new Request("http://localhost:3397/api/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: new ReadableStream({
          start(c) {
            for (const part of parts) c.enqueue(part);
            c.close();
          },
        }),
        duplex: "half",
      } as RequestInit);
    expect((await POST(stream([new Uint8Array([0xff])]))).status).toBe(400);
    expect(
      (await POST(stream([new Uint8Array(8000), new Uint8Array(8001)]))).status,
    ).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("counts malformed requests and ignores spoofed local IP headers", async () => {
    for (let i = 0; i < 5; i++)
      expect(
        (await POST(req("{", { "x-forwarded-for": `10.0.0.${i}` }))).status,
      ).toBe(400);
    const res = await POST(req());
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects cross-site/browser form submissions", async () => {
    expect(
      (await POST(req(attempt, { origin: "https://evil.test" }))).status,
    ).toBe(403);
    expect(
      (await POST(req(attempt, { "sec-fetch-site": "cross-site" }))).status,
    ).toBe(403);
    expect(
      (await POST(req(attempt, { "content-type": "text/plain" }))).status,
    ).toBe(415);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("blocks Production even with the test flag and credentials set", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const res = await POST(req());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, code: "studio_pending" });
    expect(fetch).not.toHaveBeenCalled();
    expect(deliverQuote).not.toHaveBeenCalled();
  });
});
