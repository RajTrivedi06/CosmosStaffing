import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { account } from "../../src/lib/site";
import { toStudioIntake } from "../../src/lib/quote-attempt";
import { homeQuote } from "../unit/fixtures";
import { choicesLink, finishQuestions, storedText } from "../e2e/quote-helpers";

/**
 * REAL paired verification. The website, the running Studio and one isolated
 * Supabase Auth/database project; every assertion about records comes from
 * the Studio through the real customer API, its staff screens or its own
 * /q and /pay pages. Synthetic accounts only; emails go to the lease's
 * capture inbox. No Stripe payment is attempted. See docs/client-accounts.md.
 */
const STUDIO = process.env.PAIRED_STUDIO ?? "http://127.0.0.1:3351";
const MAILPIT = process.env.PAIRED_MAILPIT ?? "http://127.0.0.1:54924";
const AUTH = process.env.PAIRED_AUTH ?? "http://127.0.0.1:54921";
const PASSWORD = "calm-and-clean-paired-42";
const UNKNOWN_TOKEN = "00000000-0000-4000-8000-00000000dead";

test.describe.configure({ mode: "serial" });

const seed = readFileSync(
  path.resolve(
    process.env.STUDIO_IMPLEMENTATION_ROOT ??
      "../wt-integration-implementation",
    "apps/operations-studio/supabase/seed.sql",
  ),
  "utf8",
);
/** The Studio's local seeded staff fixture, as its own browser tests use it. */
const staffPassword = (role: string) =>
  new RegExp(`'${role}@studio.test', crypt\\('([^']+)'`).exec(seed)![1];

const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
// Unique per run: the lease's queue keeps earlier runs' requests.
const alice = { name: `Alice ${stamp}`, email: `alice-${stamp}@example.test` };
const bob = { name: `Bob ${stamp}`, email: `bob-${stamp}@example.test` };
let aliceContext: BrowserContext;
let bobContext: BrowserContext;
let requestPath = "";
let jobId = "";
let quotePath = "";
let payPath = "";

const newContext = (browser: Browser, baseURL: string, use: object) =>
  browser.newContext({ ...use, baseURL });

async function emailLink(page: Page, to: string, already = 0) {
  let href = "";
  await expect
    .poll(
      async () => {
        const res = await page.request.get(
          `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
        );
        const { messages = [] } = await res.json();
        if (messages.length <= already) return false;
        const message = await (
          await page.request.get(`${MAILPIT}/api/v1/message/${messages[0].ID}`)
        ).json();
        href =
          /href="([^"]*\/account\/confirm[^"]*)"/.exec(message.HTML)?.[1] ?? "";
        return href.length > 0;
      },
      { timeout: 20_000 },
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

async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: account.signIn.submit, exact: true })
    .click();
}

async function anonymousAnswers(page: Page, name: string, email: string) {
  await page.goto("/");
  await page.evaluate(
    (draft) =>
      sessionStorage.setItem("cosmos-quote-draft", JSON.stringify(draft)),
    { answers: { ...homeQuote, name, email }, step: "review" },
  );
}

async function sendAdopted(page: Page, name: string, email: string) {
  await anonymousAnswers(page, name, email);
  await page.goto("/quote");
  await page.getByRole("button", { name: account.quote.adopt }).click();
  await finishQuestions(page, { name, email });
  await expect(page.getByText(name).first()).toBeVisible();
}

/**
 * Restarts this site's process through the lease's launcher, via a script the
 * website owner supplies. The local limiter allows five sends a process in ten
 * minutes, and this suite needs more.
 */
function restartWebsite(mode: "correct" | "invalid" = "correct") {
  const control = process.env.PAIRED_SITE_CONTROL;
  if (!control) throw new Error("Set PAIRED_SITE_CONTROL");
  execFileSync(control, [mode], { stdio: "inherit" });
}

const unconfirmed = "We couldn't confirm that your request was saved.";
const conflict = "We can't match this request ID to its earlier attempt";

/** The real Studio commits; only its answer to the browser is lost. */
async function loseNextAnswer(page: Page) {
  const committed = { status: 0 };
  await page.route(
    "**/api/quote",
    async (route) => {
      committed.status = (await route.fetch()).status();
      await route.abort("connectionfailed");
    },
    { times: 1 },
  );
  return committed;
}

async function signedIn(
  browser: Browser,
  baseURL: string,
  use: object,
  email = alice.email,
) {
  const context = await newContext(browser, baseURL, use);
  const page = await context.newPage();
  await page.goto("/account/login");
  await signIn(page, email);
  await expect(page).toHaveURL(/\/account$/, { timeout: 20_000 });
  return { context, page };
}

const blocked = async (page: Page, id: string) => {
  await expect(
    page.getByRole("heading", { name: account.quote.unresolvedTitle }),
  ).toBeVisible();
  await expect(page.getByText(id)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Send my request|Try again/ }),
  ).toHaveCount(0);
};

/** Who is signed in to the Studio staff app, as a role. */
async function staffPage(browser: Browser, role: "staff" | "admin") {
  const context = await browser.newContext({
    viewport: { width: 1400, height: 1000 },
  });
  const page = await context.newPage();
  await page.goto(`${STUDIO}/login`);
  await page.getByLabel("Email").fill(`${role}@studio.test`);
  await page.getByLabel("Password").fill(staffPassword(role));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
  return page;
}

type Session = Record<string, unknown> & {
  refresh_token: string;
  expires_at: number;
};
function clientCookies(cookies: { name: string; value: string }[]) {
  return cookies
    .filter((c) => /^cosmos-client-auth(\.\d+)?$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}
async function readSession(context: BrowserContext): Promise<Session> {
  const joined = clientCookies(await context.cookies())
    .map((c) => c.value)
    .join("");
  return JSON.parse(
    Buffer.from(joined.replace(/^base64-/, ""), "base64url").toString(),
  );
}
/** Mark the access token expired so the next server read must refresh it. */
async function expireAccessToken(context: BrowserContext, baseURL: string) {
  const session = await readSession(context);
  const old = clientCookies(await context.cookies());
  const value = `base64-${Buffer.from(
    JSON.stringify({ ...session, expires_at: 1 }),
  ).toString("base64url")}`;
  for (const cookie of old) await context.clearCookies({ name: cookie.name });
  const chunks = value.match(/.{1,3180}/g)!;
  await context.addCookies(
    chunks.map((chunk, i) => ({
      name:
        chunks.length === 1 ? "cosmos-client-auth" : `cosmos-client-auth.${i}`,
      value: chunk,
      url: baseURL,
      httpOnly: true,
      sameSite: "Lax" as const,
    })),
  );
  return session.refresh_token;
}

/**
 * Bob acting directly on the Studio's customer API with his real, valid token
 * and the server credential: what a page can't offer, the API must refuse.
 * The credential is read from the lease's private file, never printed.
 */
function studioAs(context: BrowserContext, page: Page) {
  const file = process.env.PAIRED_WEBSITE_ENV;
  if (!file)
    throw new Error("Set PAIRED_WEBSITE_ENV to the lease's website.env");
  const secret = /^WEBSITE_INTAKE_SECRET=['"]?([^'"\n]+)/m.exec(
    readFileSync(file, "utf8"),
  )![1];
  return async (method: "GET" | "POST", apiPath: string, data?: object) => {
    const { access_token } = (await readSession(context)) as unknown as {
      access_token: string;
    };
    const res = await page.request.fetch(
      `${STUDIO}/api/customer/v2${apiPath}`,
      {
        method,
        data,
        headers: {
          Authorization: `Bearer ${access_token}`,
          "X-Webhook-Secret": secret,
          Cookie: "",
        },
      },
    );
    return { status: res.status(), body: await res.json() };
  };
}

test.afterAll(async () => {
  await aliceContext?.close();
  await bobContext?.close();
});

test("signup, confirmation in a new tab, explicit adoption and an authenticated send", async ({
  browser,
  baseURL,
  contextOptions,
}) => {
  aliceContext = await newContext(browser, baseURL!, contextOptions);
  const page = await aliceContext.newPage();
  await anonymousAnswers(page, alice.name, alice.email);
  await page.goto("/quote");
  await page.getByRole("link", { name: account.quote.create }).click();
  // Only choices wait on this device.
  expect(await storedText(page)).not.toContain(alice.email);
  await page.getByLabel("Email").fill(alice.email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: account.signUp.submit }).click();
  await expect(page.getByText(alice.email)).toBeVisible({ timeout: 20_000 });

  // Through the lease's template, back to this site's callback.
  const link = await emailLink(page, alice.email);
  expect(new URL(link).pathname).toBe("/account/confirm");
  expect(new URL(link).searchParams.get("next")).toBe("/quote");
  const tab = await aliceContext.newPage();
  await tab.goto(link);
  await expect(tab).toHaveURL(/\/quote(\?|$)/);
  expect(tab.url()).not.toContain("token_hash");

  // No second sign-in, and nothing adopted until the client says so.
  await expect(
    tab.getByRole("heading", { name: account.quote.adoptTitle }),
  ).toBeVisible();
  await expect(tab.getByText(alice.name)).toHaveCount(0);
  await tab.getByRole("button", { name: account.quote.adopt }).click();
  await finishQuestions(tab, alice);
  await tab.getByRole("button", { name: "Send my request" }).click();
  await expect(
    tab.getByRole("heading", { name: "Thank you. Your request is in." }),
  ).toBeVisible({ timeout: 20_000 });

  // Real history from the Studio.
  await tab.getByRole("link", { name: "Back to my account" }).click();
  await expect(tab.getByText("Request received")).toBeVisible();
  await tab.getByRole("link", { name: "Details" }).click();
  await expect(tab).toHaveURL(/\/account\/requests\/[0-9a-f-]{36}$/);
  requestPath = new URL(tab.url()).pathname;
  await expect(tab.getByText("Pets at home")).toBeVisible();
  await expect(tab.getByText(account.request.noQuotes)).toBeVisible();
  await tab.close();
  await page.close();
});

test("the request reaches the Studio's staff queue with its answers", async ({
  browser,
}) => {
  const staff = await staffPage(browser, "staff");
  await staff.goto(STUDIO);
  const line = staff.getByText(`Review website inquiry · ${alice.name}`);
  await expect(line.first()).toBeVisible();
  await line.first().click();
  await expect(staff).toHaveURL(/\/jobs\/[0-9a-f-]{36}/);
  jobId = /\/jobs\/([0-9a-f-]{36})/.exec(staff.url())![1];
  await expect(staff.locator("#main-content")).toContainText(alice.email);
  await expect(staff.locator("#main-content")).toContainText(
    "verified customer account",
  );
  // Identity comes from the account, not a price or a booking.
  await expect(staff.locator("#main-content")).toContainText("Needs quote");
  await staff.context().close();
});

test("a lost response retries with the same ID; a repeat request is new", async () => {
  const page = await aliceContext.newPage();
  await sendAdopted(page, alice.name, alice.email);

  // The real Studio commits; only the answer to the browser is lost.
  let upstream = 0;
  await page.route(
    "**/api/quote",
    async (route) => {
      upstream = (await route.fetch()).status();
      await route.abort("connectionfailed");
    },
    { times: 1 },
  );
  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(
    page.getByText("We couldn't confirm that your request was saved."),
  ).toBeVisible({ timeout: 20_000 });
  expect(upstream).toBe(202);

  // A reload keeps the attempt; the retry is Studio's identical replay.
  await page.reload();
  const replay = page.waitForResponse("**/api/quote");
  await page.getByRole("button", { name: "Try again" }).click();
  expect((await replay).status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "Thank you. Your request is in." }),
  ).toBeVisible();

  // One new record, not two; then a genuinely new request is a third.
  await page.goto("/account");
  await expect(page.getByRole("link", { name: "Details" })).toHaveCount(2);
  await sendAdopted(page, alice.name, alice.email);
  const fresh = page.waitForResponse("**/api/quote");
  await page.getByRole("button", { name: "Send my request" }).click();
  expect((await fresh).status()).toBe(202);
  await page.goto("/account");
  await expect(page.getByRole("link", { name: "Details" })).toHaveCount(3);
  await page.close();
});

test("a second account sees nothing of the first", async ({
  browser,
  baseURL,
  contextOptions,
}) => {
  bobContext = await newContext(browser, baseURL!, contextOptions);
  const page = await bobContext.newPage();
  await page.goto("/account/signup");
  await page.getByLabel("Email").fill(bob.email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: account.signUp.submit }).click();
  await expect(
    page.getByRole("heading", { name: account.checkEmail.title }),
  ).toBeVisible({ timeout: 20_000 });
  await page.goto(await emailLink(page, bob.email));
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText(account.home.noRequests)).toBeVisible();

  await page.goto(requestPath);
  await expect(
    page.getByRole("heading", { name: account.request.notFound.title }),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText(alice.name);
  await page.close();
});

test("staff quote the job; the owner sees it to review", async ({
  browser,
}) => {
  const staff = await staffPage(browser, "staff");
  await staff.goto(`${STUDIO}/jobs/${jobId}`);
  await staff.getByText(/^Revise job details/).click();
  await staff.locator('input[name="sqft"]').fill("1400");
  await staff.getByRole("button", { name: "Save new scope revision" }).click();
  await expect(
    staff.getByText(/^Scope revision \d+ saved/).first(),
  ).toBeVisible({
    timeout: 20_000,
  });
  await staff.getByRole("button", { name: "Edit price", exact: true }).click();
  await staff.getByRole("dialog").getByLabel("Cleaner payout ($)").fill("100");
  await staff
    .getByLabel("Scope and fixed payout confirmed with the cleaner")
    .check();
  await staff
    .getByLabel("Referral eligibility verified in the shared record")
    .check();
  await staff.getByLabel("Job cost assumptions verified").check();
  await staff.getByRole("button", { name: "Save new version" }).click();
  await expect(
    staff.getByRole("dialog").getByText("Version 1", { exact: true }),
  ).toBeVisible();
  await staff.context().close();

  const admin = await staffPage(browser, "admin");
  await admin.goto(`${STUDIO}/jobs/${jobId}`);
  await admin
    .getByRole("region", { name: "Client", exact: true })
    .getByRole("button", { name: "Approve & send" })
    .click();
  await expect(
    admin
      .getByRole("region", { name: "Client", exact: true })
      .getByRole("button", { name: "Copy client link" }),
  ).toBeVisible({ timeout: 20_000 });
  await admin.context().close();

  const page = await aliceContext.newPage();
  await page.goto("/account");
  await expect(
    page.getByRole("heading", { name: account.home.sections.quotes }),
  ).toBeVisible();
  const review = page.getByRole("link", { name: "Review quote" });
  quotePath = (await review.getAttribute("href"))!;
  expect(quotePath).toMatch(/^\/q\/[0-9a-f-]{36}$/);
  await page.goto(requestPath);
  await expect(page.getByText("Quote sent")).toBeVisible();
  await page.close();
});

test("a signed-out quote link signs in and returns to that exact quote", async ({
  browser,
  baseURL,
  contextOptions,
}) => {
  const context = await newContext(browser, baseURL!, contextOptions);
  const page = await context.newPage();
  await page.goto(quotePath);
  await expect(page).toHaveURL(
    `/account/login?next=${encodeURIComponent(quotePath)}`,
  );
  await signIn(page, alice.email);
  await expect(page).toHaveURL(quotePath, { timeout: 20_000 });
  await expect(
    page.getByRole("button", { name: "Accept quote", exact: true }),
  ).toBeVisible();
  await context.close();
});

test("another account's quote link reads exactly like a missing one", async () => {
  const page = await bobContext.newPage();
  await page.goto(`/q/${UNKNOWN_TOKEN}`);
  const missing = await page.locator("body").innerText();
  await page.goto(quotePath);
  await expect(
    page.getByRole("button", { name: "Accept quote", exact: true }),
  ).toHaveCount(0);
  expect(await page.locator("body").innerText()).toBe(missing);
  await expect(page.locator("body")).not.toContainText(alice.name);
  await page.close();
});

test("another account can't act on the quote through the Studio's API", async () => {
  const page = await bobContext.newPage();
  const asBob = studioAs(bobContext, page);
  const token = quotePath.split("/").at(-1)!;
  const id = requestPath.split("/").at(-1)!;
  const notFound = { status: 404, body: { ok: false, code: "not_found" } };
  expect(await asBob("GET", `/requests/${id}`)).toEqual(notFound);
  expect(await asBob("GET", `/quotes/${token}`)).toEqual(notFound);
  expect(
    await asBob("POST", `/quotes/${token}/accept`, {
      name: alice.name,
      terms_accepted: true,
    }),
  ).toEqual(notFound);
  expect(
    await asBob("POST", `/quotes/${token}/changes`, { message: "Forged" }),
  ).toEqual(notFound);
  // His own view is unchanged; hers still shows the quote open.
  expect((await asBob("GET", "/requests?limit=1")).body.items).toEqual([]);
  await page.close();
  const owner = await aliceContext.newPage();
  await owner.goto(quotePath);
  await expect(
    owner.getByRole("button", { name: "Accept quote", exact: true }),
  ).toBeVisible();
  await owner.close();
});

test("the session refreshes through the gateway on a Studio page", async ({
  baseURL,
}) => {
  const before = await expireAccessToken(aliceContext, baseURL!);
  const page = await aliceContext.newPage();
  const response = await page.goto(quotePath);
  expect(response?.headers()["cache-control"]).toContain("no-store");
  await expect(
    page.getByRole("button", { name: "Accept quote", exact: true }),
  ).toBeVisible();
  const after = await readSession(aliceContext);
  expect(after.refresh_token).not.toBe(before);
  expect(after.expires_at).toBeGreaterThan(Date.now() / 1000);
  for (const cookie of clientCookies(await aliceContext.cookies())) {
    expect(cookie).toMatchObject({
      domain: "localhost",
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
    });
  }
  await page.close();
});

test("the session refreshes through this site's own proxy too", async ({
  baseURL,
}) => {
  const before = await expireAccessToken(aliceContext, baseURL!);
  const page = await aliceContext.newPage();
  await page.goto("/account");
  await expect(page.getByText(alice.email)).toBeVisible();
  await expect(page.getByRole("link", { name: "Details" })).toHaveCount(3);
  expect((await readSession(aliceContext)).refresh_token).not.toBe(before);
  await page.close();
});

test("the owner accepts through the gateway; that is not a booking", async () => {
  const page = await aliceContext.newPage();
  await page.goto(quotePath);
  await page.getByLabel("Type your full name to accept").fill(alice.name);
  await page
    .getByRole("checkbox", { name: /I agree to the Terms of Service/ })
    .check();
  await page.getByRole("button", { name: "Accept quote", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Quote accepted" }),
  ).toBeVisible({ timeout: 20_000 });

  await page.goto(requestPath);
  const facts = await page.locator(".account-head").innerText();
  expect(facts).toContain("Quote accepted");
  expect(facts).toContain("Not scheduled yet");
  expect(facts).not.toMatch(/\bBooked\b/);
  await page.goto("/account");
  await expect(
    page.getByRole("heading", { name: account.home.sections.quotes }),
  ).toHaveCount(0);
  await page.close();
});

test("a payment link is the owner's alone, and returns through sign-in", async ({
  browser,
  baseURL,
  contextOptions,
}) => {
  const staff = await staffPage(browser, "staff");
  await staff.goto(`${STUDIO}/jobs/${jobId}`);
  await staff.locator("#pay-description").fill("Synthetic paired test");
  await staff
    .locator('input[name="amount_dollars"]')
    .locator("xpath=ancestor::form")
    .getByRole("button")
    .click();
  await expect(staff.getByRole("button", { name: "Copy link" })).toBeVisible({
    timeout: 20_000,
  });
  await staff.context().close();

  const page = await aliceContext.newPage();
  await page.goto(requestPath);
  const pay = page.getByRole("link", { name: "Pay", exact: true });
  payPath = (await pay.getAttribute("href"))!;
  expect(payPath).toMatch(/^\/pay\/[0-9a-f-]{36}$/);
  await page.goto(payPath);
  await expect(page.locator("body")).toContainText("$");
  await page.close();

  const other = await bobContext.newPage();
  await other.goto(`/pay/${UNKNOWN_TOKEN}`);
  const missing = await other.locator("body").innerText();
  await other.goto(payPath);
  expect(await other.locator("body").innerText()).toBe(missing);
  const asBob = studioAs(bobContext, other);
  const notFound = { status: 404, body: { ok: false, code: "not_found" } };
  const payToken = payPath.split("/").at(-1)!;
  expect(await asBob("GET", `/payments/${payToken}`)).toEqual(notFound);
  expect(await asBob("POST", `/payments/${payToken}/checkout`, {})).toEqual(
    notFound,
  );
  await other.close();

  const context = await newContext(browser, baseURL!, contextOptions);
  const fresh = await context.newPage();
  await fresh.goto(payPath);
  await expect(fresh).toHaveURL(
    `/account/login?next=${encodeURIComponent(payPath)}`,
  );
  await signIn(fresh, alice.email);
  await expect(fresh).toHaveURL(payPath, { timeout: 20_000 });
  await context.close();
});

test("a changed session sends nothing as the new account", async () => {
  const page = await aliceContext.newPage();
  await sendAdopted(page, "Alice Unsent", alice.email);
  // Alice's session ends without a sign-out here; Bob's takes its place.
  const bobCookies = clientCookies(await bobContext.cookies());
  const aliceCookies = clientCookies(await aliceContext.cookies());
  for (const cookie of aliceCookies)
    await aliceContext.clearCookies({ name: cookie.name });
  await aliceContext.addCookies(
    (await bobContext.cookies()).filter((c) =>
      bobCookies.some((b) => b.name === c.name),
    ),
  );
  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(
    page.getByRole("heading", { name: account.quote.switchedTitle }),
  ).toBeVisible();
  await expect(page.getByText("Alice Unsent")).toHaveCount(0);
  await page.goto("/account");
  await expect(page.getByText(bob.email)).toBeVisible();
  await expect(page.getByText(account.home.noRequests)).toBeVisible();

  // Back as Alice: still her three requests, nothing new.
  await aliceContext.clearCookies();
  await page.goto("/account/login");
  await signIn(page, alice.email);
  await expect(page).toHaveURL(/\/account$/, { timeout: 20_000 });
  await expect(page.getByRole("link", { name: "Details" })).toHaveCount(3);
  await page.close();
});

test("sign-out ends the session and leaves other roles' cookies", async ({
  baseURL,
}) => {
  await aliceContext.addCookies([
    { name: "sb-studio-auth-token", value: "cleaner-session", url: baseURL! },
  ]);
  const page = await aliceContext.newPage();
  await page.goto("/account");
  await page.getByRole("button", { name: account.home.signOut }).click();
  await expect(page).toHaveURL(/\/account\/login\?reason=signed_out$/, {
    timeout: 15_000,
  });
  const cookies = await aliceContext.cookies();
  expect(clientCookies(cookies)).toEqual([]);
  expect(cookies.some((c) => c.name === "sb-studio-auth-token")).toBe(true);
  await page.goto(quotePath);
  await expect(page).toHaveURL(
    `/account/login?next=${encodeURIComponent(quotePath)}`,
  );
  await page.close();
});

test("a session revoked at Auth is refused by the Studio, without a redirect loop", async ({
  browser,
  baseURL,
  contextOptions,
}) => {
  const file = process.env.PAIRED_WEBSITE_ENV!;
  const key = /^AUTH_SUPABASE_PUBLISHABLE_KEY=['"]?([^'"\n]+)/m.exec(
    readFileSync(file, "utf8"),
  )![1];
  const context = await newContext(browser, baseURL!, contextOptions);
  const page = await context.newPage();
  await page.goto("/account/login");
  await signIn(page, alice.email);
  await expect(page).toHaveURL(/\/account$/, { timeout: 20_000 });

  // Revoke every session of Alice's at Auth. Her access token still verifies
  // locally until it expires; only the Studio's live check can see this.
  const { access_token } = (await readSession(context)) as unknown as {
    access_token: string;
  };
  const revoked = await page.request.post(
    `${AUTH}/auth/v1/logout?scope=global`,
    { headers: { apikey: key, Authorization: `Bearer ${access_token}` } },
  );
  expect(revoked.status()).toBe(204);

  // The account page says so, and stays put.
  await page.goto("/account");
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText(account.home.rejected.title)).toBeVisible();

  // A quote link doesn't bounce between the two applications: the Studio
  // refuses the session and clears it through the gateway, and sign-in keeps
  // the destination.
  const documents: string[] = [];
  page.on("framenavigated", (frame) => documents.push(frame.url()));
  await page.goto(quotePath);
  await expect(page).toHaveURL(
    `/account/login?next=${encodeURIComponent(quotePath)}`,
  );
  await expect(page.getByLabel("Email")).toBeVisible();
  await page.waitForTimeout(1_500);
  expect(documents.length).toBeLessThan(4);
  expect(clientCookies(await context.cookies())).toEqual([]);

  // Signing in again goes back to that exact quote.
  await signIn(page, alice.email);
  await expect(page).toHaveURL(quotePath, { timeout: 20_000 });
  await context.close();
});

test("a session revoked during a send needs a real new sign-in and can't duplicate", async ({
  browser,
  baseURL,
  contextOptions,
}) => {
  restartWebsite();
  const key = /^AUTH_SUPABASE_PUBLISHABLE_KEY=['"]?([^'"\n]+)/m.exec(
    readFileSync(process.env.PAIRED_WEBSITE_ENV!, "utf8"),
  )![1];
  const name = `Alice Held ${stamp}`;
  const context = await newContext(browser, baseURL!, contextOptions);
  const page = await context.newPage();
  await page.goto("/account/login");
  await signIn(page, alice.email);
  await expect(page).toHaveURL(/\/account$/, { timeout: 20_000 });
  const details = page.getByRole("link", { name: "Details" });
  await expect(details.first()).toBeVisible();
  const before = await details.count();
  await page.goto(choicesLink);
  await finishQuestions(page, { name, email: alice.email });

  const { access_token } = (await readSession(context)) as unknown as {
    access_token: string;
  };
  expect(
    (
      await page.request.post(`${AUTH}/auth/v1/logout?scope=global`, {
        headers: { apikey: key, Authorization: `Bearer ${access_token}` },
      })
    ).status(),
  ).toBe(204);

  const send = page.waitForRequest("**/api/quote");
  const refused = page.waitForResponse("**/api/quote");
  await page.getByRole("button", { name: "Send my request" }).click();
  expect((await refused).status()).toBe(401);
  await expect(
    page.getByRole("heading", { name: account.quote.sessionEndedTitle }),
  ).toBeVisible();
  const { submission_id } = (await send).postDataJSON();
  const stored = await storedText(page);
  expect(stored).not.toContain(name);
  expect(stored).not.toContain(alice.email);
  expect(stored).toContain(submission_id);

  // The sign-in page can't bounce back to the quote on the old cookies.
  const documents: string[] = [];
  page.on("framenavigated", (frame) => documents.push(frame.url()));
  await page.goto("/account/login?next=%2Fquote");
  await page.waitForTimeout(1_000);
  expect(new URL(page.url()).pathname).toBe("/account/login");
  expect(documents.length).toBeLessThan(3);
  await page
    .getByRole("button", { name: account.home.rejected.action })
    .click();
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 15_000 });
  expect(clientCookies(await context.cookies())).toEqual([]);

  await signIn(page, alice.email);
  await expect(page).toHaveURL(/\/quote(\?|$)/, { timeout: 20_000 });
  // A new session, and nothing more goes out until the client decides.
  await blocked(page, submission_id);
  await page.goto("/account");
  await expect(details).toHaveCount(before);

  await page.goto("/quote");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Start a separate request" }).click();
  await page.goto(choicesLink);
  await finishQuestions(page, { name, email: alice.email });
  const resend = page.waitForRequest("**/api/quote");
  const accepted = page.waitForResponse("**/api/quote");
  await page.getByRole("button", { name: "Send my request" }).click();
  expect((await accepted).status()).toBe(202);
  expect((await resend).postDataJSON().submission_id).not.toBe(submission_id);
  await page.goto("/account");
  await expect(details).toHaveCount(before + 1);
  await context.close();
});

test("a real conflict stays unresolved, for the owner and for anyone else", async ({
  browser,
  baseURL,
  contextOptions,
}) => {
  restartWebsite();
  const name = `Alice Conflict ${stamp}`;
  const { context, page } = await signedIn(browser, baseURL!, contextOptions);
  const details = page.getByRole("link", { name: "Details" });
  await expect(details.first()).toBeVisible();
  const before = await details.count();
  await page.goto(choicesLink);
  await finishQuestions(page, { name, email: alice.email });
  const committed = await loseNextAnswer(page);
  const sent = page.waitForRequest("**/api/quote");
  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(page.getByText(unconfirmed)).toBeVisible({ timeout: 20_000 });
  expect(committed.status).toBe(202);
  const original = (await sent).postDataJSON();
  const id: string = original.submission_id;

  // The same ID with other answers: the real Studio's 409 proves no receipt.
  await page.route(
    "**/api/quote",
    (route) =>
      route.continue({
        postData: JSON.stringify({
          ...original,
          answers: { ...original.answers, notes: "Different answers." },
        }),
      }),
    { times: 1 },
  );
  const refused = page.waitForResponse("**/api/quote");
  await page.getByRole("button", { name: "Try again" }).click();
  const reply = await refused;
  expect(reply.status()).toBe(409);
  expect(await reply.json()).toEqual({
    ok: false,
    code: "idempotency_conflict",
  });
  await expect(page.getByText(conflict)).toBeVisible();
  expect(await storedText(page)).toContain(id);

  // Another account gets the same opaque answer, and learns nothing.
  const bobPage = await bobContext.newPage();
  await bobPage.goto("/account");
  const { access_token } = (await readSession(bobContext)) as unknown as {
    access_token: string;
  };
  const secret = /^WEBSITE_INTAKE_SECRET=['"]?([^'"\n]+)/m.exec(
    readFileSync(process.env.PAIRED_WEBSITE_ENV!, "utf8"),
  )![1];
  const taken = await bobPage.request.post(`${STUDIO}/api/customer/v2/intake`, {
    data: {
      version: 2,
      submission_id: id,
      answers: toStudioIntake({
        submission_id: id,
        answers: {
          ...homeQuote,
          service: homeQuote.service!,
          name: bob.name,
          email: bob.email,
        },
      }).answers,
    },
    headers: {
      Authorization: `Bearer ${access_token}`,
      "X-Webhook-Secret": secret,
      "Idempotency-Key": id,
      Cookie: "",
    },
  });
  expect(taken.status()).toBe(409);
  expect(await taken.json()).toEqual({
    ok: false,
    code: "idempotency_conflict",
  });
  await bobPage.close();

  // The untouched snapshot is what resolves it: Studio's receipt, one record.
  const replay = page.waitForResponse("**/api/quote");
  await page.getByRole("button", { name: "Try again" }).click();
  expect((await replay).status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "Thank you. Your request is in." }),
  ).toBeVisible();
  expect(await storedText(page)).not.toContain(id);
  await page.goto("/account");
  await expect(details).toHaveCount(before + 1);
  await context.close();
});

test("logout and expiry leave only a marker, and it stays, isolated, whatever its age", async ({
  browser,
  baseURL,
  contextOptions,
}) => {
  const name = `Alice Marker ${stamp}`;
  const { context, page } = await signedIn(browser, baseURL!, contextOptions);
  const details = page.getByRole("link", { name: "Details" });
  await expect(details.first()).toBeVisible();
  const before = await details.count();
  await page.goto(choicesLink);
  await finishQuestions(page, { name, email: alice.email });
  const committed = await loseNextAnswer(page);
  const sent = page.waitForRequest("**/api/quote");
  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(page.getByText(unconfirmed)).toBeVisible({ timeout: 20_000 });
  expect(committed.status).toBe(202);
  const id: string = (await sent).postDataJSON().submission_id;
  expect(await storedText(page)).toContain(name);

  // Past the answers' 7 days, a page that doesn't know the session retires them.
  const age = (days: number) =>
    page.evaluate((days) => {
      for (const key of Object.keys(localStorage))
        if (key.startsWith("cosmos-quote-attempt:")) {
          const record = JSON.parse(localStorage.getItem(key)!);
          record.savedAt = Date.now() - days * 24 * 60 * 60 * 1000;
          localStorage.setItem(key, JSON.stringify(record));
        }
    }, days);
  await age(8);
  await page.goto("/");
  await expect.poll(() => storedText(page)).not.toContain(name);
  expect(await storedText(page)).not.toContain(alice.email);
  expect(await storedText(page)).toContain(id);

  // Years later it still stops a send, on every load.
  const sends = { count: 0 };
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/quote") sends.count += 1;
  });
  await age(1_000);
  await page.goto("/");
  await page.goto("/quote");
  await blocked(page, id);
  await page.reload();
  await blocked(page, id);
  expect(sends.count).toBe(0);

  // Sign-out keeps it; the next person here sees none of it.
  await page.goto("/account");
  await page.getByRole("button", { name: account.home.signOut }).click();
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 15_000 });
  await signIn(page, bob.email);
  await expect(page).toHaveURL(/\/account$/, { timeout: 20_000 });
  await page.goto("/quote");
  await expect(
    page.getByRole("heading", { name: account.quote.unresolvedTitle }),
  ).toHaveCount(0);
  await expect(page.getByText(id)).toHaveCount(0);

  await page.goto("/account");
  await page.getByRole("button", { name: account.home.signOut }).click();
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 15_000 });
  await signIn(page, alice.email);
  await expect(page).toHaveURL(/\/account$/, { timeout: 20_000 });
  // The one committed record stands; the marker makes no second one.
  await expect(details).toHaveCount(before + 1);
  await page.goto("/quote");
  await blocked(page, id);
  await context.close();
});

test("sensitive data an earlier version stored leaves the browser", async ({
  browser,
  baseURL,
  contextOptions,
}) => {
  const context = await newContext(browser, baseURL!, contextOptions);
  const page = await context.newPage();
  const legacy = { answers: homeQuote, step: "review" };
  await page.goto("/");
  await page.evaluate((legacy) => {
    localStorage.setItem(
      "cosmos-quote-handoff",
      JSON.stringify({ version: 1, savedAt: Date.now(), draft: legacy }),
    );
    sessionStorage.setItem("cosmos-quote-draft", JSON.stringify(legacy));
  }, legacy);
  await page.goto("/");
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("cosmos-quote-handoff")),
    )
    .toBeNull();
  await page.goto("/account/login");
  await expect.poll(() => storedText(page)).not.toContain(homeQuote.email);
  expect(await storedText(page)).not.toContain(homeQuote.notes);
  await context.close();
});

test("a wrong server credential is an operational failure at the Studio", async () => {
  const page = await aliceContext.newPage();
  await page.goto("/account");
  const { access_token } = (await readSession(aliceContext)) as unknown as {
    access_token: string;
  };
  const res = await page.request.get(`${STUDIO}/api/customer/v2/account`, {
    headers: {
      Authorization: `Bearer ${access_token}`,
      "X-Webhook-Secret": "synthetic-wrong-credential-000000",
      Cookie: "",
    },
  });
  expect(res.status()).toBe(503);
  expect(await res.json()).toEqual({
    ok: false,
    code: "service_auth_failed",
  });
  // The same session, with the right credential, is still accepted.
  expect((await studioAs(aliceContext, page)("GET", "/account")).status).toBe(
    200,
  );
  await page.close();
});

test("password recovery works through this site's callback, and ends other sessions", async ({
  browser,
  baseURL,
  contextOptions,
}) => {
  const key = /^AUTH_SUPABASE_PUBLISHABLE_KEY=['"]?([^'"\n]+)/m.exec(
    readFileSync(process.env.PAIRED_WEBSITE_ENV!, "utf8"),
  )![1];
  // The same client on another device, with a request to find afterwards.
  const other = await newContext(browser, baseURL!, contextOptions);
  const device = await other.newPage();
  await device.goto("/account/login");
  await signIn(device, alice.email);
  await expect(device).toHaveURL(/\/account$/, { timeout: 20_000 });
  const asOther = studioAs(other, device);
  expect((await asOther("GET", "/account")).status).toBe(200);
  const { refresh_token } = await readSession(other);
  const records = await device.getByRole("link", { name: "Details" }).count();

  const page = await aliceContext.newPage();
  await page.goto("/account/forgot");
  await page.getByLabel("Email").fill(alice.email);
  const before = await mailCount(page, alice.email);
  await page.getByRole("button", { name: account.forgot.submit }).click();
  await expect(page.getByText(account.forgot.sent)).toBeVisible({
    timeout: 20_000,
  });
  await page.goto(await emailLink(page, alice.email, before));
  await expect(page).toHaveURL(/\/account\/reset$/);
  await page.getByLabel("New password").fill(`${PASSWORD}-new`);
  await page.getByRole("button", { name: account.reset.submit }).click();
  await expect(page.getByText(account.reasons.password_updated)).toBeVisible({
    timeout: 20_000,
  });

  // The other device's token is unexpired, and its session is over.
  expect(await asOther("GET", "/account")).toEqual({
    status: 401,
    body: { ok: false, code: "unauthorized" },
  });
  const refreshed = await device.request.post(
    `${AUTH}/auth/v1/token?grant_type=refresh_token`,
    { headers: { apikey: key }, data: { refresh_token } },
  );
  expect(refreshed.status()).toBe(400);
  await device.goto("/account");
  await expect(device.getByText(account.home.rejected.title)).toBeVisible();
  await other.close();

  await page.getByRole("button", { name: account.home.signOut }).click();
  await expect(page).toHaveURL(/\/account\/login/, { timeout: 15_000 });
  await signIn(page, alice.email, `${PASSWORD}-new`);
  await expect(page).toHaveURL(/\/account$/, { timeout: 20_000 });
  // The same client: their records stayed bound to the account.
  await expect(page.getByRole("link", { name: "Details" })).toHaveCount(
    records,
  );
  await page.close();
});
