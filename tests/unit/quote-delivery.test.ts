import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deliverQuote } from "@/lib/quote-delivery";
import { homeQuote } from "./fixtures";

const ENV = [
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "RESEND_API_KEY",
  "QUOTE_TO_EMAIL",
  "QUOTE_FROM_EMAIL",
  "RESEND_API_URL",
];

const configureDb = () => {
  vi.stubEnv("SUPABASE_URL", "https://db.test/");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
};
const configureEmail = () => {
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("QUOTE_TO_EMAIL", "team@cosmos.test");
  vi.stubEnv("QUOTE_FROM_EMAIL", "quotes@cosmos.test");
};

type Call = { url: string; init: RequestInit };
let calls: Call[];

function mockFetch(handler: (url: string) => Response | Promise<Response>) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return handler(url);
    }),
  );
}

beforeEach(() => {
  for (const key of ENV) vi.stubEnv(key, "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("deliverQuote", () => {
  it("reports not_configured and sends nothing without credentials", async () => {
    mockFetch(() => new Response(null, { status: 500 }));
    const result = await deliverQuote(homeQuote, "abc");
    expect(result).toEqual({
      outcome: "not_configured",
      stored: "not_configured",
      emailed: "not_configured",
    });
    expect(calls).toHaveLength(0);
  });

  it("stores, emails, then records the email status", async () => {
    configureDb();
    configureEmail();
    mockFetch((url) =>
      url.startsWith("https://db.test")
        ? Response.json([{ id: "row-1" }], { status: 201 })
        : Response.json({ id: "email-1" }),
    );

    const result = await deliverQuote(homeQuote, "abc");
    expect(result).toEqual({ outcome: "sent", stored: "ok", emailed: "ok" });

    const [insert, email, patch] = calls;
    expect(insert.url).toBe("https://db.test/rest/v1/quote_requests");
    expect(insert.init.headers).toMatchObject({ apikey: "sb_secret_test" });
    expect(JSON.parse(String(insert.init.body))).toMatchObject({
      request_id: "abc",
      service: "regular",
      zip: "78701",
      email: "alex@example.com",
      phone: null,
    });

    expect(email.url).toBe("https://api.resend.com/emails");
    const message = JSON.parse(String(email.init.body));
    expect(message.reply_to).toBe("alex@example.com");
    expect(message.to).toEqual(["team@cosmos.test"]);
    expect(message.text).toContain("Size: 3 bedrooms, 2 bathrooms");

    expect(patch.url).toBe(
      "https://db.test/rest/v1/quote_requests?id=eq.row-1",
    );
    expect(JSON.parse(String(patch.init.body))).toEqual({
      email_status: "sent",
    });
  });

  it("counts as sent when only the email goes through", async () => {
    configureDb();
    configureEmail();
    mockFetch((url) =>
      url.startsWith("https://db.test")
        ? new Response(null, { status: 500 })
        : Response.json({ id: "email-1" }),
    );
    expect(await deliverQuote(homeQuote, "abc")).toEqual({
      outcome: "sent",
      stored: "failed",
      emailed: "ok",
    });
  });

  it("fails when everything configured fails", async () => {
    configureDb();
    configureEmail();
    mockFetch(() => {
      throw new Error("network down");
    });
    expect((await deliverQuote(homeQuote, "abc")).outcome).toBe("failed");
  });

  it("fails rather than claiming success when the only channel fails", async () => {
    configureEmail();
    mockFetch(() => new Response(null, { status: 422 }));
    expect(await deliverQuote(homeQuote, "abc")).toEqual({
      outcome: "failed",
      stored: "not_configured",
      emailed: "failed",
    });
  });
});
