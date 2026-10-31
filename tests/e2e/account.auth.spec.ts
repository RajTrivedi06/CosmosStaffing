import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import { account } from "../../src/lib/site";
import { homeQuote } from "../unit/fixtures";
import { finishQuestions, sessionTokens, storedText } from "./quote-helpers";

/**
 * Client accounts against REAL local Supabase Auth (supabase/config.toml) and
 * its Mailpit inbox. Synthetic accounts only. These are not paired with the
 * Studio: its account records and session contract aren't published yet.
 * Run with `npm run test:e2e:auth`.
 */
const MAILPIT = "http://127.0.0.1:54624";
const PASSWORD = "calm-and-clean-42";
const TOKEN = "SyntheticQuoteToken_0001";

/** Each sending test gets its own address under the facade's per-IP limit. */
const address = () => ({
  "x-forwarded-for": `10.77.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
});
const ownAddress = (page: Page) => page.setExtraHTTPHeaders(address());

const uniqueEmail = (tag: string) =>
  `client-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.test`;

/** The newest link to /account/confirm in the newest email to `to`. */
async function emailLink(page: Page, to: string, after = 0) {
  let href = "";
  await expect
    .poll(
      async () => {
        const res = await page.request.get(
          `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
        );
        const { messages = [] } = await res.json();
        if (messages.length <= after) return false;
        const message = await (
          await page.request.get(`${MAILPIT}/api/v1/message/${messages[0].ID}`)
        ).json();
        href =
          /href="([^"]*\/account\/confirm[^"]*)"/.exec(message.HTML)?.[1] ?? "";
        return href.length > 0;
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  return href.replaceAll("&amp;", "&");
}

async function mailCount(page: Page, to: string) {
  const res = await page.request.get(
    `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
  );
  return ((await res.json()).messages ?? []).length as number;
}

async function signUp(page: Page, email: string, next = "") {
  await page.goto(
    `/account/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`,
  );
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: account.signUp.submit }).click();
  await expect(
    page.getByRole("heading", { name: account.checkEmail.title }),
  ).toBeVisible();
}

/** A confirmed account, signed in on this page's browser context. */
async function confirmedAccount(page: Page, tag: string) {
  const email = uniqueEmail(tag);
  await signUp(page, email);
  await page.goto(await emailLink(page, email));
  await expect(page).toHaveURL(/\/account$/);
  return email;
}

async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: account.signIn.submit, exact: true })
    .click();
}

async function signOut(page: Page) {
  await page.goto("/account");
  await page.getByRole("button", { name: account.home.signOut }).click();
  // Either outcome is correct: under parallel mail load local Auth can take
  // over the 3 s limit, and sign-out then says it couldn't confirm revocation.
  await expect(page).toHaveURL(
    /\/account\/login\?reason=signed_out(_local)?$/,
    { timeout: 10_000 },
  );
}

test("a new client reviews, signs up, confirms in a new tab and sends without signing in again", async ({
  page,
  context,
}) => {
  const email = uniqueEmail("quote");
  const answers = { ...homeQuote, email };
  await ownAddress(page);
  const urls: string[] = [];
  context.on("request", (request) => urls.push(request.url()));

  // Full answers an earlier version left in this tab. A visitor can't enter
  // these now, and only the choices survive.
  await page.goto("/");
  await page.evaluate(
    (draft) =>
      sessionStorage.setItem("cosmos-quote-draft", JSON.stringify(draft)),
    { answers, step: "review" },
  );
  await page.goto("/quote");
  await expect(
    page.getByRole("heading", { name: account.quote.title }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send my request" }),
  ).toHaveCount(0);
  await expect(page.getByText(answers.name)).toHaveCount(0);

  await page.getByRole("link", { name: account.quote.create }).click();
  await expect(page).toHaveURL(/\/account\/signup\?next=%2Fquote$/);
  // Nothing personal waits on this device for sign-up to offer.
  expect(await storedText(page)).not.toContain(email);
  await expect(page.getByLabel("Email")).toHaveValue("");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: account.signUp.submit }).click();
  await expect(page.getByText(email)).toBeVisible();

  // The confirmation email opens in another tab, which has no sessionStorage.
  const link = await emailLink(page, email);
  const tab = await context.newPage();
  await ownAddress(tab);
  await tab.goto(link);
  await expect(tab).toHaveURL(/\/quote(\?|$)/);
  // Answers from before sign-in wait for the client to adopt them.
  await tab.getByRole("button", { name: account.quote.adopt }).click();
  // The choices came across; everything personal is asked now.
  await finishQuestions(tab, answers);
  await expect(
    tab.getByText(`${account.quote.signedInAs} ${email}`),
  ).toBeVisible();
  await expect(tab.getByText(answers.name)).toBeVisible();

  // Sending goes through as this verified client. (Delivery itself is not
  // configured on the test server, so the facade answers "not connected".)
  const response = tab.waitForResponse("**/api/quote");
  await tab.getByRole("button", { name: "Send my request" }).click();
  const res = await response;
  expect(res.status()).toBe(503);
  expect(await res.json()).toEqual({ ok: false, code: "not_configured" });
  await expect(
    tab.getByText("We couldn't send this online yet."),
  ).toBeVisible();

  // No personal details or drafts in any address.
  for (const url of urls.filter((u) => u.includes("127.0.0.1:3201"))) {
    expect(url).not.toContain(encodeURIComponent(email));
    expect(url).not.toContain(email);
    expect(url).not.toContain(encodeURIComponent(answers.name));
    expect(url).not.toContain("phone");
  }

  // The session cookie: host-only, HttpOnly, Lax; never the Studio's name.
  const cookies = (await context.cookies()).filter((c) =>
    c.name.startsWith("cosmos-client-auth"),
  );
  expect(cookies.length).toBeGreaterThan(0);
  for (const cookie of cookies) {
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("Lax");
    expect(cookie.domain).toBe("127.0.0.1");
  }
  expect((await context.cookies()).some((c) => c.name.startsWith("sb-"))).toBe(
    false,
  );
});

test("returning clients sign in with just their password, no email code", async ({
  page,
}) => {
  const email = await confirmedAccount(page, "return");
  await signOut(page);
  const before = await mailCount(page, email);
  await signIn(page, email);
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText(email)).toBeVisible();
  // Signing in sent nothing.
  expect(await mailCount(page, email)).toBe(before);
  // Already signed in: sign-up doesn't ask again.
  await page.goto("/account/signup");
  await expect(page).toHaveURL(/\/account$/);
});

test("the account home shows only what is real", async ({ page }) => {
  await confirmedAccount(page, "home");
  await expect(
    page.getByRole("heading", { name: account.home.title }),
  ).toBeVisible();
  await expect(page.getByText(account.home.notConnected.title)).toBeVisible();
  for (const section of Object.values(account.home.sections))
    await expect(page.getByRole("heading", { name: section })).toHaveCount(0);
  await page.getByRole("link", { name: account.home.newRequest }).click();
  await expect(page).toHaveURL(/\/quote$/);
  await page.getByRole("link", { name: account.quote.backToAccount }).click();
  await expect(page).toHaveURL(/\/account$/);
  // Private: not cached, indexed or referred on.
  const res = await page.request.get("/account");
  expect(res.headers()["cache-control"]).toContain("no-store");
  expect(res.headers()["x-robots-tag"]).toContain("noindex");
});

test("an unconfirmed account can't sign in, and can ask for the link again", async ({
  page,
}) => {
  const email = uniqueEmail("unconfirmed");
  await signUp(page, email);
  await page.goto("/account/login");
  await signIn(page, email);
  await expect(page.locator("main").getByRole("alert")).toHaveText(
    account.errors.unconfirmed,
  );
  const before = await mailCount(page, email);
  // Supabase sends at most one email per address per second (local
  // max_frequency); a faster resend is rightly refused as too many attempts.
  await page.waitForTimeout(1_100);
  await page.getByRole("button", { name: account.checkEmail.resend }).click();
  // Sending waits on the local mail server, slow under parallel load.
  await expect(page.getByText(account.checkEmail.resent)).toBeVisible({
    timeout: 15_000,
  });
  await expect.poll(() => mailCount(page, email)).toBeGreaterThan(before);
  // A used or stale link explains itself instead of failing silently.
  const link = await emailLink(page, email);
  await page.goto(link);
  await expect(page).toHaveURL(/\/account$/);
  await signOut(page);
  await page.goto(link);
  await expect(page.getByText(account.reasons.link_expired)).toBeVisible();
});

test("wrong passwords and existing emails reveal nothing", async ({ page }) => {
  const email = await confirmedAccount(page, "enum");
  await signOut(page);
  await signIn(page, email, "not-the-password");
  await expect(page.locator("main").getByRole("alert")).toHaveText(
    account.errors.credentials,
  );
  await page.goto("/account/login");
  await signIn(page, uniqueEmail("nobody"), "not-the-password");
  await expect(page.locator("main").getByRole("alert")).toHaveText(
    account.errors.credentials,
  );
  // Signing up again with a taken email looks the same as a new sign-up.
  await signUp(page, email);
  await expect(page.getByText(account.checkEmail.existing)).toBeVisible();
});

test("sign-in returns only to safe destinations", async ({ page }) => {
  const email = await confirmedAccount(page, "redirect");
  await signOut(page);
  for (const evil of [
    "https://evil.example/",
    "//evil.example",
    "/\\evil.example",
    "/me",
  ]) {
    await page.goto(`/account/login?next=${encodeURIComponent(evil)}`);
    await expect(page.locator('input[name="next"]')).toHaveValue("/account");
  }
  await signIn(page, email);
  await expect(page).toHaveURL(/127\.0\.0\.1:3201\/account$/);
});

test("a quote link that needs sign-in returns to that exact quote", async ({
  page,
}) => {
  const email = await confirmedAccount(page, "studio");
  await signOut(page);
  await page.goto(`/account/login?next=%2Fq%2F${TOKEN}&reason=signin_required`);
  await expect(page.getByText(account.reasons.signin_required)).toBeVisible();
  await signIn(page, email);
  // A full page load into the forwarded Studio page (here, its local stub).
  await expect(page).toHaveURL(new RegExp(`/q/${TOKEN}$`));
  await expect(page.locator("#path")).toHaveText(`/q/${TOKEN}`);
  // Signed in already: the sign-in link goes straight on.
  await page.goto(`/account/login?next=%2Fq%2F${TOKEN}`);
  await expect(page).toHaveURL(new RegExp(`/q/${TOKEN}$`));
});

test("a link for another account says so without its details", async ({
  page,
}) => {
  const email = await confirmedAccount(page, "wrong");
  await page.goto(`/account/login?next=%2Fq%2F${TOKEN}&reason=wrong_account`);
  await expect(page.getByText(account.reasons.wrong_account)).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.locator("main")).not.toContainText(TOKEN);
  await page
    .getByRole("button", { name: "Sign out and switch account" })
    .click();
  await expect(page).toHaveURL(
    `/account/login?next=%2Fq%2F${TOKEN}&reason=signed_out`,
  );
  await expect(page.getByLabel("Email")).toBeVisible();
});

test("an ended session asks to sign in again", async ({ page, context }) => {
  await confirmedAccount(page, "expired");
  await ownAddress(page);
  // Break the session as an expired, unrefreshable one would be.
  const cookies = await context.cookies();
  await context.clearCookies();
  await context.addCookies(
    cookies
      .filter((c) => c.name.startsWith("cosmos-client-auth"))
      .map((c) => ({ ...c, value: "base64-eyJleHBpcmVkIjp0cnVlfQ" })),
  );
  await page.goto("/account");
  await expect(page).toHaveURL(/\/account\/login\?reason=session_expired$/);
  await expect(page.getByText(account.reasons.session_expired)).toBeVisible();

  // Mid-send: the facade refuses.
  await context.addCookies(
    cookies
      .filter((c) => c.name.startsWith("cosmos-client-auth"))
      .map((c) => ({ ...c, value: "base64-eyJleHBpcmVkIjp0cnVlfQ" })),
  );
  // page.request doesn't carry the page's extra headers.
  const res = await page.request.post("/api/quote", {
    headers: address(),
    data: { submission_id: crypto.randomUUID(), answers: homeQuote },
  });
  expect(res.status()).toBe(401);
  expect(await res.json()).toEqual({ ok: false, code: "sign_in_required" });
});

test("signing out ends the session and forgets a waiting quote", async ({
  page,
}) => {
  await confirmedAccount(page, "logout");
  await page.evaluate(() =>
    localStorage.setItem(
      "cosmos-quote-handoff",
      JSON.stringify({ version: 2, savedAt: Date.now(), answers: {} }),
    ),
  );
  await signOut(page);
  expect(
    await page.evaluate(() => localStorage.getItem("cosmos-quote-handoff")),
  ).toBeNull();
  expect(
    (await page.context().cookies()).filter((c) =>
      /^cosmos-client-auth(\.\d+)?$/.test(c.name),
    ),
  ).toEqual([]);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/account\/login\?reason=signin_required$/);
});

test("a forgotten password is reset by email link", async ({ page }) => {
  const email = await confirmedAccount(page, "reset");
  await signOut(page);
  await page.getByRole("link", { name: account.signIn.forgot }).click();
  await expect(
    page.getByRole("heading", { name: account.forgot.title }),
  ).toBeVisible();
  await page.getByLabel("Email").fill(email);
  const before = await mailCount(page, email);
  await page.getByRole("button", { name: account.forgot.submit }).click();
  await expect(page.getByText(account.forgot.sent)).toBeVisible();
  // The same answer for an email with no account.
  await page.goto("/account/forgot");
  await page.getByLabel("Email").fill(uniqueEmail("ghost"));
  await page.getByRole("button", { name: account.forgot.submit }).click();
  await expect(page.getByText(account.forgot.sent)).toBeVisible();

  await page.goto(await emailLink(page, email, before));
  await expect(page).toHaveURL(/\/account\/reset$/);
  await page.getByLabel("New password").fill("a-brand-new-password");
  await page.getByRole("button", { name: account.reset.submit }).click();
  await expect(page.getByText(account.reasons.password_updated)).toBeVisible();
  await signOut(page);
  await signIn(page, email);
  await expect(page.locator("main").getByRole("alert")).toHaveText(
    account.errors.credentials,
  );
  await page.goto("/account/login");
  await signIn(page, email, "a-brand-new-password");
  await expect(page).toHaveURL(/\/account$/);
});

for (const [reason, status, body] of [
  ["the edge's rate limit", 429, "Too Many Requests"],
  ["a server failure", 500, "Internal Server Error"],
] as const)
  test(`after ${reason}, a form claims no outcome and resends nothing`, async ({
    page,
  }) => {
    const email = await confirmedAccount(page, "limited");
    await signOut(page);
    await page.goto("/account/login?next=%2Fquote");
    const posts: string[] = [];
    await page.route("**/account/login*", (route) => {
      if (route.request().method() !== "POST") return route.continue();
      posts.push(route.request().url());
      return route.fulfill({ status, contentType: "text/plain", body });
    });
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page
      .getByRole("button", { name: account.signIn.submit, exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: account.errors.interrupted.title }),
    ).toBeVisible();
    // The request may have taken effect, so nothing says it failed or why.
    await expect(page.locator("main")).not.toContainText(
      /didn't go through|too many|failed/i,
    );
    await page.waitForTimeout(1_000);
    expect(posts).toHaveLength(1);

    // Going back is the client's choice, and sends nothing by itself.
    await page.unroute("**/account/login*");
    await page
      .getByRole("button", { name: account.errors.interrupted.action })
      .click();
    await expect(page.getByLabel("Email")).toBeVisible();
    await page.waitForTimeout(500);
    expect(posts).toHaveLength(1);
    await expect(page).toHaveURL(/next=%2Fquote/);
    await signIn(page, email);
    await expect(page).toHaveURL(/\/quote(\?|$)/);
  });

test("a signed-in client needs an emailed link to change their password", async ({
  page,
}) => {
  const email = await confirmedAccount(page, "change");
  await signOut(page);
  await signIn(page, email);
  await expect(page).toHaveURL(/\/account$/);

  // Signed in with a password: no form, and a clear way to get a link.
  await page.goto("/account/reset");
  await expect(page.getByText(account.reset.linkRequired)).toBeVisible();
  await expect(page.getByLabel("New password")).toHaveCount(0);
  await page.getByRole("link", { name: account.forgot.submit }).click();
  await expect(page).toHaveURL(/\/account\/forgot$/);

  const before = await mailCount(page, email);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: account.forgot.submit }).click();
  await expect(page.getByText(account.forgot.sent)).toBeVisible();
  await page.goto(await emailLink(page, email, before));
  await expect(page).toHaveURL(/\/account\/reset$/);
  await page.getByLabel("New password").fill(`${PASSWORD}-new`);
  await page.getByRole("button", { name: account.reset.submit }).click();
  await expect(page.getByText(account.reasons.password_updated)).toBeVisible();
});

test("a password reset ends the client's other sessions at Auth", async ({
  page,
  browser,
  baseURL,
}) => {
  const AUTH = "http://127.0.0.1:54621";
  const apikey = /^PUBLISHABLE_KEY="?([^"\n]+)"?$/m.exec(
    execFileSync("supabase", ["status", "-o", "env"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }),
  )![1];
  const email = await confirmedAccount(page, "other-session");

  // The same client, signed in on another device.
  const other = await browser.newContext({ baseURL });
  const device = await other.newPage();
  await device.goto("/account/login");
  await signIn(device, email);
  await expect(device).toHaveURL(/\/account$/);
  const { access_token, refresh_token } = await sessionTokens(other);
  const live = () =>
    page.request.get(`${AUTH}/auth/v1/user`, {
      headers: { apikey, Authorization: `Bearer ${access_token}` },
    });
  expect((await live()).status()).toBe(200);

  const before = await mailCount(page, email);
  await page.goto("/account/forgot");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: account.forgot.submit }).click();
  await expect(page.getByText(account.forgot.sent)).toBeVisible();
  await page.goto(await emailLink(page, email, before));
  await page.getByLabel("New password").fill(`${PASSWORD}-new`);
  await page.getByRole("button", { name: account.reset.submit }).click();
  await expect(page.getByText(account.reasons.password_updated)).toBeVisible();

  // Its token hasn't expired, but Auth has ended the session behind it.
  expect(
    JSON.parse(Buffer.from(access_token.split(".")[1], "base64url").toString())
      .exp * 1000,
  ).toBeGreaterThan(Date.now());
  expect((await live()).status()).toBe(403);
  const refreshed = await page.request.post(
    `${AUTH}/auth/v1/token?grant_type=refresh_token`,
    { headers: { apikey }, data: { refresh_token } },
  );
  expect(refreshed.status()).toBe(400);
  // The one that changed the password carries on.
  await page.goto("/account");
  await expect(page).toHaveURL(/\/account$/);
  await other.close();
});

test("account screens fit a phone without sideways scrolling", async ({
  page,
}) => {
  for (const path of ["/account/login", "/account/signup", "/account/forgot"]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
    for (const target of await page.locator("main button, main a").all()) {
      const box = await target.boundingBox();
      if (box)
        expect(box.height, `${path} tap target`).toBeGreaterThanOrEqual(44);
    }
  }
});

test("a refused sign-in keeps the email, clears the password and retries at once", async ({
  page,
}) => {
  const email = await confirmedAccount(page, "retry");
  await signOut(page);
  await signIn(page, email, "not-the-password");
  await expect(page.locator("main").getByRole("alert")).toHaveText(
    account.errors.credentials,
  );
  await expect(page.getByLabel("Email")).toHaveValue(email);
  const password = page.getByLabel("Password", { exact: true });
  await expect(password).toHaveValue("");
  await expect(password).toBeFocused();
  await password.fill(PASSWORD);
  await page
    .getByRole("button", { name: account.signIn.submit, exact: true })
    .click();
  await expect(page).toHaveURL(/\/account$/);
});

test("account pages keep referrers on this site; the token link sends none", async ({
  page,
}) => {
  for (const path of ["/account/login", "/account/signup", "/account/forgot"]) {
    const res = await page.request.get(path);
    expect(res.headers()["referrer-policy"], path).toBe("same-origin");
  }
  const confirm = await page.request.get(
    "/account/confirm?token_hash=synthetic&type=email",
    { maxRedirects: 0 },
  );
  expect(confirm.status()).toBe(303);
  expect(confirm.headers()["referrer-policy"]).toBe("no-referrer");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("native sign-in works, keeps the email when refused, and sends the real Origin", async ({
    page,
    browser,
  }) => {
    // The account is made in a normal (JavaScript) browser context.
    const setup = await browser.newPage();
    const email = await confirmedAccount(setup, "nojs");
    await setup.close();

    await page.goto("/account/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("not-the-password");
    const refused = page.waitForRequest((r) => r.method() === "POST");
    await page
      .getByRole("button", { name: account.signIn.submit, exact: true })
      .click();
    const origin = (await refused).headers().origin;
    expect(origin).toBe(new URL(page.url()).origin);
    await expect(page.locator("main").getByRole("alert")).toHaveText(
      account.errors.credentials,
    );
    await expect(page.getByLabel("Email")).toHaveValue(email);
    await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");

    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page
      .getByRole("button", { name: account.signIn.submit, exact: true })
      .click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByText(email)).toBeVisible();
  });

  test("a refused native sign-in keeps its destination through the retry", async ({
    page,
    context,
    browser,
  }) => {
    const setup = await browser.newPage();
    const email = await confirmedAccount(setup, "nojs-next");
    await setup.close();

    for (const [next, lands] of [
      ["/quote", /127\.0\.0\.1:3201\/quote$/],
      [`/q/${TOKEN}`, new RegExp(`127\\.0\\.0\\.1:3201/q/${TOKEN}$`)],
      // Not allowed: falls back to the account home, refused or not.
      ["https://evil.example/", /127\.0\.0\.1:3201\/account$/],
    ] as const) {
      await context.clearCookies();
      const kept = next.startsWith("/") ? next : "/account";
      await page.goto(`/account/login?next=${encodeURIComponent(next)}`);
      await signIn(page, email, "not-the-password");
      await expect(page.locator("main").getByRole("alert")).toHaveText(
        account.errors.credentials,
      );
      // The retry form still carries the validated destination.
      await expect(page.locator('input[name="next"]')).toHaveValue(kept);
      await signIn(page, email);
      await expect(page, next).toHaveURL(lands);
      if (kept.startsWith("/q/"))
        await expect(page.locator("#path")).toHaveText(kept);
    }
  });

  test("a sign-in posted from another site is refused and signs no one in", async ({
    page,
    browser,
  }) => {
    const setup = await browser.newPage();
    const email = await confirmedAccount(setup, "csrf");
    await setup.close();

    // The real form's fields, including Next's Server Action reference.
    await page.goto("/account/login");
    const fields = await page
      .locator("main form input[name]")
      .evaluateAll((inputs) =>
        (inputs as HTMLInputElement[]).map((input) => [
          input.name,
          input.value,
        ]),
      );
    const multipart: Record<string, string> = Object.fromEntries(fields);
    multipart.email = email;
    multipart.password = PASSWORD;
    expect(
      Object.keys(multipart).some((name) => name.startsWith("$ACTION")),
    ).toBe(true);

    for (const origin of ["https://evil.example", "null"]) {
      const res = await page.request.post("/account/login", {
        multipart,
        headers: { origin },
        maxRedirects: 0,
      });
      expect(res.status(), origin).toBeGreaterThanOrEqual(400);
      const setCookie = res
        .headersArray()
        .filter((h) => h.name.toLowerCase() === "set-cookie")
        .map((h) => h.value)
        .join("\n");
      expect(setCookie, origin).not.toContain("cosmos-client-auth");
    }
    expect(
      (await page.context().cookies()).some((c) =>
        c.name.startsWith("cosmos-client-auth"),
      ),
    ).toBe(false);
    await page.goto("/account");
    await expect(page).toHaveURL(/\/account\/login\?reason=signin_required$/);
  });
});
