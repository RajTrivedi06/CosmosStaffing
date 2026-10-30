import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACCOUNT_HOME,
  destinationOr,
  isStudioDestination,
  safeDestination,
  signInHref,
  signInReason,
  withNext,
} from "@/lib/account/destination";
import {
  AUTH_COOKIE,
  authConfig,
  cookieOptions,
  hasSessionCookie,
} from "@/lib/account/config";
import {
  HANDOFF_TTL_MS,
  readQuoteHandoff,
  writeQuoteHandoff,
} from "@/lib/quote-handoff";
import { accountOverview, type AccountOverview } from "@/lib/account/records";
import { AccountOverviewView } from "@/components/account/AccountOverview";
import { account } from "@/lib/site";
import { homeQuote } from "./fixtures";

const token = "AbC_dEf-123456789012";

describe("return destinations", () => {
  it.each(["/account", "/quote", `/q/${token}`, `/pay/${token}`])(
    "accepts %s",
    (path) => {
      expect(safeDestination(path)).toBe(path);
    },
  );

  it.each([
    "https://evil.example/account",
    "//evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "/%2F%2Fevil.example",
    "javascript:alert(1)",
    "/account/confirm",
    "/account/login",
    "/quote?service=deep",
    "/quote#review",
    "/me",
    "/me/login",
    "/join/" + token,
    "/o/" + token,
    "/q/short",
    `/q/${token}/extra`,
    `/q/${token}?next=//evil.example`,
    "/login",
    "/people",
    " /account",
    "/account\n",
    "",
    undefined,
    ["/account"],
  ])("rejects %j", (value) => {
    expect(safeDestination(value)).toBeNull();
    expect(destinationOr(value)).toBe(ACCOUNT_HOME);
  });

  it("opens only Studio pages with a full page load", () => {
    expect(isStudioDestination(`/q/${token}`)).toBe(true);
    expect(isStudioDestination("/quote")).toBe(false);
  });

  it("builds sign-in links that carry the destination and a known reason", () => {
    expect(signInHref(ACCOUNT_HOME)).toBe("/account/login");
    expect(signInHref("/quote", "session_expired")).toBe(
      "/account/login?next=%2Fquote&reason=session_expired",
    );
    expect(withNext("/account/signup", `/q/${token}`)).toBe(
      `/account/signup?next=%2Fq%2F${token}`,
    );
    expect(signInReason("wrong_account")).toBe("wrong_account");
    expect(signInReason("<script>")).toBeNull();
  });
});

describe("auth configuration", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is off unless both values are set", () => {
    vi.stubEnv("AUTH_SUPABASE_URL", "");
    vi.stubEnv("AUTH_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    expect(authConfig()).toBeNull();
  });

  it.each([
    ["http://auth.example", null],
    ["https://user:pw@auth.example", null],
    ["not a url", null],
    ["http://127.0.0.1:54621", "http://127.0.0.1:54621"],
    ["https://auth.example/", "https://auth.example"],
  ])("accepts %s only over HTTPS or loopback", (url, expected) => {
    vi.stubEnv("AUTH_SUPABASE_URL", url);
    vi.stubEnv("AUTH_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    expect(authConfig()?.url ?? null).toBe(expected);
  });

  it("keeps the session cookie host-only, HttpOnly and Lax", () => {
    const options = cookieOptions("cosmosservicesllc.com");
    expect(options).toEqual({
      name: AUTH_COOKIE,
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: true,
    });
    expect(options).not.toHaveProperty("domain");
    // Never the Studio's default name, which cleaners' /me sessions use.
    expect(AUTH_COOKIE).not.toMatch(/^sb-/);
    expect(cookieOptions("localhost").secure).toBe(false);
  });

  it("recognises the session cookie whole or chunked, nothing else", () => {
    expect(hasSessionCookie([{ name: AUTH_COOKIE }])).toBe(true);
    expect(hasSessionCookie([{ name: `${AUTH_COOKIE}.1` }])).toBe(true);
    expect(hasSessionCookie([{ name: "sb-abc-auth-token" }])).toBe(false);
    expect(hasSessionCookie([{ name: `${AUTH_COOKIE}-code-verifier` }])).toBe(
      false,
    );
  });
});

describe("quote handoff through sign-in", () => {
  const now = 1_800_000_000_000;
  const draft = { answers: homeQuote, step: "review" as const };

  it("restores the reviewed answers", () => {
    expect(
      readQuoteHandoff(writeQuoteHandoff(draft, now), now + 60_000),
    ).toEqual(draft);
  });

  it("expires after a day and rejects tampered or future copies", () => {
    const saved = writeQuoteHandoff(draft, now);
    expect(readQuoteHandoff(saved, now + HANDOFF_TTL_MS + 1)).toBeNull();
    expect(readQuoteHandoff(saved, now - 1)).toBeNull();
    expect(readQuoteHandoff("{", now)).toBeNull();
    expect(
      readQuoteHandoff(
        JSON.stringify({ version: 2, savedAt: now, draft }),
        now,
      ),
    ).toBeNull();
  });

  it("keeps only valid answers from a damaged copy", () => {
    const raw = JSON.stringify({
      version: 1,
      savedAt: now,
      draft: { answers: { ...homeQuote, zip: "x".repeat(50) }, step: "review" },
    });
    const restored = readQuoteHandoff(raw, now);
    expect(restored?.answers.zip).toBeUndefined();
    expect(restored?.answers.email).toBe(homeQuote.email);
  });
});

describe("account home", () => {
  const render = (overview: AccountOverview, paged = false) =>
    renderToStaticMarkup(
      createElement(AccountOverviewView, { overview, paged }),
    ).replaceAll("&#x27;", "'");
  const ready = (
    patch: Partial<Extract<AccountOverview, { status: "ready" }>> = {},
  ): AccountOverview => ({
    status: "ready",
    quotes: [],
    requests: [],
    upcoming: [],
    completed: [],
    payments: null,
    nextCursor: null,
    quotesIncomplete: false,
    ...patch,
  });

  it("shows nothing invented while the customer API isn't configured", async () => {
    const overview = await accountOverview(null);
    expect(overview).toEqual({ status: "not_connected" });
    const html = render(overview);
    expect(html).toContain(account.home.notConnected.title);
    expect(html).not.toContain(account.home.sections.requests);
  });

  it("says when the records can't be loaded, or the email isn't confirmed", () => {
    expect(render({ status: "unavailable" })).toContain(
      account.home.unavailable.title,
    );
    expect(render({ status: "unverified" })).toContain(
      account.home.unverified.title,
    );
  });

  it("asks to sign in again when the Studio refuses the session", () => {
    const html = render({ status: "signin" });
    expect(html).toContain(account.home.rejected.title);
    expect(html).toContain(account.home.rejected.action);
  });

  it("says plainly when the account has no requests yet", () => {
    const html = render(ready());
    expect(html).toContain(account.home.noRequests);
    expect(html).not.toContain(account.home.sections.quotes);
  });

  // Synthetic display data; real records come from the Studio's customer API.
  it("lists quotes first, with Studio links as plain anchors and requests as site links", () => {
    const html = render(
      ready({
        quotes: [
          {
            id: "synthetic-q",
            title: "Quote for request #1001",
            facts: ["$180.00 total"],
            href: `/q/${token}`,
            action: "Review quote",
          },
        ],
        requests: [
          {
            id: "synthetic-r",
            title: "Request #1001",
            facts: ["Quote sent"],
            href: "/account/requests/00000000-0000-4000-8000-000000000001",
            action: "Details",
          },
        ],
        nextCursor:
          "2026-10-30 12:00:00+00|00000000-0000-4000-8000-000000000001",
      }),
    );
    expect(html.indexOf(account.home.sections.quotes)).toBeLessThan(
      html.indexOf(account.home.sections.requests),
    );
    expect(html).toContain(`<a class="btn btn-glass" href="/q/${token}">`);
    expect(html).toContain(
      'href="/account/requests/00000000-0000-4000-8000-000000000001"',
    );
    expect(html).toContain(account.home.older);
    // Upcoming/completed only appear when there are some; no payments list.
    expect(html).not.toContain(account.home.sections.upcoming);
    expect(html).not.toContain(account.home.sections.payments);
  });

  it("offers the newest page from an older one", () => {
    expect(render(ready(), true)).toContain(account.home.newest);
  });
});
