import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deliverQuote } from "@/lib/quote-delivery";
import { homeQuote } from "./fixtures";

const ENV = [
  "QUOTE_DELIVERY_MODE",
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
      phone: homeQuote.phone,
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

  it("does not send email or claim success when persistence fails", async () => {
    configureDb();
    configureEmail();
    mockFetch((url) =>
      url.startsWith("https://db.test")
        ? new Response(null, { status: 500 })
        : Response.json({ id: "email-1" }),
    );
    expect(await deliverQuote(homeQuote, "abc")).toEqual({
      outcome: "failed",
      stored: "failed",
      emailed: "not_configured",
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

  it("does not use email as a substitute for persistence", async () => {
    configureEmail();
    mockFetch(() => new Response(null, { status: 422 }));
    expect(await deliverQuote(homeQuote, "abc")).toEqual({
      outcome: "not_configured",
      stored: "not_configured",
      emailed: "not_configured",
    });
  });
});

describe("authoritative delivery boundary", () => {
  it.each(["studio", "typo"])(
    "never falls back or writes to either system in %s mode",
    async (mode) => {
      configureDb();
      configureEmail();
      vi.stubEnv("QUOTE_DELIVERY_MODE", mode);
      mockFetch(() => Response.json([{ id: "unexpected" }]));
      expect((await deliverQuote(homeQuote, "abc")).outcome).toBe(
        "not_configured",
      );
      expect(calls).toHaveLength(0);
    },
  );

  it.each([[], {}, [{ id: "" }], [{ nope: true }]].map((body) => ({ body })))(
    "rejects an invalid persistence acknowledgement: %j",
    async ({ body }) => {
      configureDb();
      configureEmail();
      mockFetch(() => Response.json(body));
      expect((await deliverQuote(homeQuote, "abc")).outcome).toBe("failed");
      expect(calls).toHaveLength(1);
    },
  );

  it("confirms persistence even when its email notification fails", async () => {
    configureDb();
    configureEmail();
    mockFetch((url) =>
      url.startsWith("https://db.test")
        ? Response.json([{ id: "row-1" }])
        : new Response(null, { status: 503 }),
    );
    expect(await deliverQuote(homeQuote, "abc")).toEqual({
      outcome: "sent",
      stored: "ok",
      emailed: "failed",
    });
  });
});
