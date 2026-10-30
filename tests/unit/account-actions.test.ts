import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { account } from "@/lib/site";

/**
 * The account Server Actions with the real, pinned Supabase SDK and synthetic
 * Auth HTTP answers (a stubbed fetch). Mocked transport, not real Auth: the
 * real-Auth browser cases are in tests/e2e/account.auth.spec.ts.
 */

type Jar = Map<string, { value: string; maxAge?: number }>;
let jar: Jar;
const store = {
  getAll: () => [...jar].map(([name, { value }]) => ({ name, value })),
  get: (name: string) =>
    jar.has(name) ? { name, value: jar.get(name)!.value } : undefined,
  set: (name: string, value: string, options: { maxAge?: number } = {}) => {
    // A browser drops a cookie set to expire now.
    if (options.maxAge === 0) jar.delete(name);
    else jar.set(name, { value, maxAge: options.maxAge });
  },
};
vi.mock("next/headers", () => ({
  cookies: async () => store,
  headers: async () => new Headers({ host: "cosmosservicesllc.com" }),
}));
class Redirect extends Error {}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirect(to);
  },
}));

const encode = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
function sessionCookie(expiresIn: number) {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: "00000000-0000-4000-8000-000000000099",
    email: "a@example.test",
  };
  const claims = {
    sub: user.id,
    email: user.email,
    exp: now + expiresIn,
    iat: now - 60,
  };
  return `base64-${encode({
    access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode(claims)}.synthetic`,
    refresh_token: "synthetic-refresh",
    expires_at: now + expiresIn,
    expires_in: 3600,
    token_type: "bearer",
    user,
  })}`;
}

/** Answer every Auth request with `status` (and record the paths asked). */
const calls: string[] = [];
function authAnswers(answer: (path: string) => [number, object]) {
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const path = new URL(String(input instanceof Request ? input.url : input))
      .pathname;
    calls.push(path);
    const [status, body] = answer(path);
    return new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  });
}

let actions: typeof import("@/app/account/actions");
beforeEach(async () => {
  jar = new Map();
  calls.length = 0;
  vi.stubEnv("AUTH_SUPABASE_URL", "http://127.0.0.1:54999");
  vi.stubEnv("AUTH_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_synthetic");
  vi.resetModules();
  actions = await import("@/app/account/actions");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};
async function redirectOf(run: Promise<unknown>) {
  try {
    await run;
  } catch (error) {
    if (error instanceof Redirect) return error.message;
    throw error;
  }
  throw new Error("expected a redirect");
}

// Sign-out waits up to 3 s for Supabase while the SDK retries an outage.
describe("sign-out", { timeout: 10_000 }, () => {
  function signedInJar(expiresIn: number) {
    jar.set("cosmos-client-auth", { value: sessionCookie(expiresIn) });
    jar.set("cosmos-client-auth-flow-abc-code-verifier", { value: "verifier" });
    // Other roles' sessions and unrelated cookies on the same host.
    jar.set("sb-studio-auth-token", { value: "cleaner-session" });
    jar.set("sb-studio-auth-token.0", { value: "cleaner-chunk" });
    jar.set("theme", { value: "light" });
  }

  it("clears every client cookie when an expired session can't refresh (Auth 503)", async () => {
    signedInJar(-60);
    authAnswers(() => [503, { message: "Synthetic Auth outage" }]);
    const to = await redirectOf(actions.signOut(form({})));
    // Supabase was asked, failed, and the page says only this device.
    expect(calls.some((path) => path.endsWith("/token"))).toBe(true);
    expect(to).toBe("/account/login?reason=signed_out_local");
    expect([...jar.keys()].sort()).toEqual([
      "sb-studio-auth-token",
      "sb-studio-auth-token.0",
      "theme",
    ]);
    // Nothing left that could restore the client session.
    const { clientSession } = await import("@/lib/account/server");
    authAnswers(() => [503, {}]);
    expect(await clientSession()).toEqual({ state: "signed_out" });
  });

  it("clears chunked sessions too, keeping the destination for a switch", async () => {
    jar.set("cosmos-client-auth.0", { value: sessionCookie(-60).slice(0, 40) });
    jar.set("cosmos-client-auth.1", { value: sessionCookie(-60).slice(40) });
    authAnswers(() => [503, {}]);
    const to = await redirectOf(
      actions.signOut(form({ next: "/q/SyntheticQuoteToken_0001" })),
    );
    expect(to).toBe(
      "/account/login?next=%2Fq%2FSyntheticQuoteToken_0001&reason=signed_out_local",
    );
    expect(jar.size).toBe(0);
  });

  it("says signed out only when Supabase ended the session", async () => {
    signedInJar(3600);
    authAnswers((path) => (path.endsWith("/logout") ? [204, {}] : [200, {}]));
    const to = await redirectOf(actions.signOut(form({})));
    expect(calls.some((path) => path.endsWith("/logout"))).toBe(true);
    expect(to).toBe("/account/login?reason=signed_out");
    expect(jar.has("cosmos-client-auth")).toBe(false);
    expect(jar.get("sb-studio-auth-token")?.value).toBe("cleaner-session");
  });
});

describe("password recovery", () => {
  const ask = () =>
    actions.requestReset({}, form({ email: "a@example.test", next: "/quote" }));

  it("reports an accepted request without saying whether an account exists", async () => {
    authAnswers(() => [200, {}]);
    expect(await ask()).toEqual({ notice: account.forgot.sent });
  });

  it.each([
    [500, account.errors.unavailable],
    [503, account.errors.unavailable],
    [429, account.errors.rateLimited],
  ])(
    "never claims an email was sent when Auth answers %i",
    async (status, error) => {
      authAnswers(() => [status, { message: "Synthetic failure" }]);
      const state = await ask();
      expect(state).toEqual({ error, email: "a@example.test" });
      expect(state).not.toHaveProperty("notice");
    },
  );
});

describe("refused sign-in", () => {
  it("keeps the email and never echoes the password", async () => {
    authAnswers(() => [
      400,
      { code: "invalid_credentials", message: "Invalid login credentials" },
    ]);
    const state = await actions.signIn(
      {},
      form({ email: "a@example.test", password: "not-it", next: "/quote" }),
    );
    expect(state).toEqual({
      error: account.errors.credentials,
      email: "a@example.test",
    });
    expect(JSON.stringify(state)).not.toContain("not-it");
  });

  it("keeps the email through an Auth outage", async () => {
    authAnswers(() => [503, { message: "Synthetic outage" }]);
    const state = await actions.signIn(
      {},
      form({ email: "a@example.test", password: "whatever-1" }),
    );
    expect(state).toEqual({
      error: account.errors.unavailable,
      email: "a@example.test",
    });
  });
});
