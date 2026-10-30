import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { account } from "../../src/lib/site";
import { homeQuote } from "../unit/fixtures";

/**
 * Customer intake (QUOTE_DELIVERY_MODE=customer) in the real browser, with
 * REAL local Supabase Auth and a MOCK of the Studio's customer API
 * (customer-api-stub.mjs: tokens are decoded, not verified; records are in
 * memory). This checks the website's own behaviour: account-bound drafts and
 * attempts, adoption, retries, account switching and what each account is
 * shown. It is not paired evidence of Studio identity, ownership or storage.
 * Run with `npm run test:e2e:auth`.
 */
const MAILPIT = "http://127.0.0.1:54624";
const STUB = "http://127.0.0.1:3398";
const PASSWORD = "calm-and-clean-42";

const uniqueEmail = (tag: string) =>
  `customer-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.test`;

async function emailLink(page: Page, to: string) {
  let href = "";
  await expect
    .poll(
      async () => {
        const res = await page.request.get(
          `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
        );
        const { messages = [] } = await res.json();
        if (!messages.length) return false;
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

async function stubState(page: Page, email: string) {
  const res = await page.request.get(
    `${STUB}/__stub/state?email=${encodeURIComponent(email)}`,
  );
  return (await res.json()) as { requests: number; submissions: string[] };
}

/** The mock commits this account's next request, then loses the answer. */
async function failNextIntake(page: Page, email: string) {
  await page.request.post(
    `${STUB}/__stub/fail-next-intake?email=${encodeURIComponent(email)}`,
  );
}

async function signUpAndConfirm(page: Page, email: string) {
  await page.goto("/account/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: account.signUp.submit }).click();
  // Sign-up waits on the local mail server, slow under parallel load.
  await expect(
    page.getByRole("heading", { name: account.checkEmail.title }),
  ).toBeVisible({ timeout: 15_000 });
  await page.goto(await emailLink(page, email));
  await expect(page).toHaveURL(/\/account$/);
}

async function signIn(page: Page, email: string) {
  await page.goto("/account/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page
    .getByRole("button", { name: account.signIn.submit, exact: true })
    .click();
  await expect(page).toHaveURL(/\/account$/);
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

/** Signed-out answers waiting in this tab, as if typed before signing in. */
async function anonymousAnswers(page: Page, name: string, email: string) {
  await page.goto("/");
  await page.evaluate(
    (draft) =>
      sessionStorage.setItem("cosmos-quote-draft", JSON.stringify(draft)),
    { answers: { ...homeQuote, name, email }, step: "review" },
  );
}

/** Open the quote, take over the waiting answers, arrive at review. */
async function adoptAndReview(page: Page, name: string) {
  await page.goto("/quote");
  await expect(
    page.getByRole("heading", { name: account.quote.adoptTitle }),
  ).toBeVisible();
  // Not loaded until the client says so.
  await expect(page.getByText(name)).toHaveCount(0);
  await page.getByRole("button", { name: account.quote.adopt }).click();
  await expect(page.getByText(name)).toBeVisible();
}

const ownAddress = (context: BrowserContext) =>
  context.setExtraHTTPHeaders({
    "x-forwarded-for": `10.88.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
  });

// Several real accounts per test, each with its own confirmation email.
test.describe.configure({ timeout: 90_000 });

test.beforeEach(({ context }) => ownAddress(context));

test("a new client confirms in a new tab, adopts their answers, sends once and sees it", async ({
  page,
  context,
}) => {
  const email = uniqueEmail("new");
  await anonymousAnswers(page, "Ada Newcomer", email);
  await page.goto("/quote");
  await page.getByRole("link", { name: account.quote.create }).click();
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: account.signUp.submit }).click();
  await expect(page.getByText(email)).toBeVisible();

  const tab = await context.newPage();
  await tab.goto(await emailLink(page, email));
  await expect(tab).toHaveURL(/\/quote(\?|$)/);
  await adoptAndReview(tab, "Ada Newcomer");
  await tab.getByRole("button", { name: "Send my request" }).click();
  await expect(
    tab.getByRole("heading", { name: "Thank you. Your request is in." }),
  ).toBeVisible();
  expect((await stubState(tab, email)).requests).toBe(1);

  await tab.getByRole("link", { name: "Back to my account" }).click();
  await expect(
    tab.getByRole("heading", { name: account.home.sections.requests }),
  ).toBeVisible();
  await expect(tab.getByText("Request received")).toBeVisible();
  await tab.getByRole("link", { name: "Details" }).click();
  await expect(tab.getByText("Ada Newcomer")).toBeVisible();
  await tab.getByRole("link", { name: account.request.back }).click();
  await expect(tab).toHaveURL(/\/account$/);
});

test("starting fresh discards answers from before sign-in", async ({
  page,
}) => {
  const email = uniqueEmail("fresh");
  await signUpAndConfirm(page, email);
  await anonymousAnswers(page, "Someone Earlier", "earlier@example.test");
  await page.goto("/quote");
  await page.getByRole("button", { name: account.quote.discard }).click();
  await expect(
    page.getByRole("heading", { name: account.quote.adoptTitle }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: account.quote.adoptTitle }),
  ).toHaveCount(0);
  await expect(page.getByText("Someone Earlier")).toHaveCount(0);
});

test("a lost response retries with the same ID; a repeat request gets a new one", async ({
  page,
}) => {
  const email = uniqueEmail("retry");
  await signUpAndConfirm(page, email);
  await anonymousAnswers(page, "Rita Retry", email);
  await adoptAndReview(page, "Rita Retry");

  // The mock commits the request, then the answer is lost.
  await failNextIntake(page, email);
  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(
    page.getByText("We couldn't confirm that your request was saved."),
  ).toBeVisible();
  // Reloading must not mint a new ID.
  await page.reload();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", { name: "Thank you. Your request is in." }),
  ).toBeVisible();
  const first = await stubState(page, email);
  expect(first.requests).toBe(1);

  // A genuinely new request is a new submission.
  await anonymousAnswers(page, "Rita Again", email);
  await adoptAndReview(page, "Rita Again");
  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(
    page.getByRole("heading", { name: "Thank you. Your request is in." }),
  ).toBeVisible();
  const second = await stubState(page, email);
  expect(second.requests).toBe(2);
  expect(new Set(second.submissions).size).toBe(2);
});

test("signing out in another tab takes the answers off this one", async ({
  page,
  context,
}) => {
  const email = uniqueEmail("tabs");
  await signUpAndConfirm(page, email);
  await anonymousAnswers(page, "Tess Tabs", email);
  await adoptAndReview(page, "Tess Tabs");

  const other = await context.newPage();
  await signOut(other);

  // No click here: the signal from the other tab clears this screen.
  await expect(page.getByText("Tess Tabs")).toHaveCount(0);
  await expect(page).toHaveURL(/\/quote$/);
  await page.reload();
  await expect(page.getByText("Tess Tabs")).toHaveCount(0);
  expect((await stubState(page, email)).requests).toBe(0);
});

test("if the session changes with no signal, nothing is sent as the new account", async ({
  page,
  context,
}) => {
  const alice = uniqueEmail("alice");
  const bob = uniqueEmail("bob");
  await signUpAndConfirm(page, bob);
  await signOut(page);
  await signUpAndConfirm(page, alice);
  await anonymousAnswers(page, "Alice Private", alice);
  await adoptAndReview(page, "Alice Private");

  // Alice's session ends without a sign-out here; Bob signs in elsewhere.
  await context.clearCookies();
  const other = await context.newPage();
  await signIn(other, bob);

  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(
    page.getByRole("heading", { name: account.quote.switchedTitle }),
  ).toBeVisible();
  // Her answers leave the screen, and nothing was sent as either account.
  await expect(page.getByText("Alice Private")).toHaveCount(0);
  expect((await stubState(page, alice)).requests).toBe(0);
  expect((await stubState(page, bob)).requests).toBe(0);

  // Bob's own quote screen shows nothing of Alice's.
  await other.goto("/quote");
  await expect(other.getByText("Alice Private")).toHaveCount(0);
  await expect(
    other.getByRole("heading", { name: account.quote.adoptTitle }),
  ).toHaveCount(0);
});

test("an unconfirmed attempt waits for its own account, never another", async ({
  page,
}) => {
  const alice = uniqueEmail("keep-a");
  const bob = uniqueEmail("keep-b");
  await signUpAndConfirm(page, bob);
  await signOut(page);
  await signUpAndConfirm(page, alice);
  await anonymousAnswers(page, "Alice Pending", alice);
  await adoptAndReview(page, "Alice Pending");
  await failNextIntake(page, alice);
  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(
    page.getByText("We couldn't confirm that your request was saved."),
  ).toBeVisible();
  const saved = await stubState(page, alice);
  expect(saved.requests).toBe(1);

  await signOut(page);
  await signIn(page, bob);
  await page.goto("/quote");
  await expect(page.getByText("Alice Pending")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);

  await signOut(page);
  await signIn(page, alice);
  await page.goto("/quote");
  await expect(page.getByText("Alice Pending")).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", { name: "Thank you. Your request is in." }),
  ).toBeVisible();
  // The same submission, replayed: still one request.
  expect(await stubState(page, alice)).toEqual(saved);
});

test("another customer's request reads as not found", async ({ page }) => {
  const alice = uniqueEmail("owner-a");
  const bob = uniqueEmail("owner-b");
  await signUpAndConfirm(page, bob);
  await signOut(page);
  await signUpAndConfirm(page, alice);
  await anonymousAnswers(page, "Alice Owner", alice);
  await adoptAndReview(page, "Alice Owner");
  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(
    page.getByRole("heading", { name: "Thank you. Your request is in." }),
  ).toBeVisible();
  await page.goto("/account");
  const href = await page
    .getByRole("link", { name: "Details" })
    .getAttribute("href");
  expect(href).toMatch(/^\/account\/requests\/[0-9a-f-]{36}$/);

  await signOut(page);
  await signIn(page, bob);
  await page.goto(href!);
  await expect(
    page.getByRole("heading", { name: account.request.notFound.title }),
  ).toBeVisible();
  await expect(page.getByText("Alice Owner")).toHaveCount(0);
  await page.goto("/account");
  await expect(page.getByText(account.home.noRequests)).toBeVisible();
});

test("a session the Studio rejects asks to sign in again, without a redirect loop", async ({
  page,
}) => {
  const email = uniqueEmail("rejected");
  await signUpAndConfirm(page, email);
  await page.request.post(
    `${STUB}/__stub/reject?email=${encodeURIComponent(email)}`,
  );
  // The local session still verifies; only the Studio refuses it.
  await page.goto("/account");
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText(account.home.rejected.title)).toBeVisible();
  // Sign-in doesn't auto-continue to a Studio page that would only bounce back.
  const quote = "/q/00000000-0000-4000-8000-000000000123";
  await page.goto(`/account/login?next=${encodeURIComponent(quote)}`);
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/account\/login/);
  await expect(page.getByText(account.home.rejected.title)).toBeVisible();
  await page.goto("/account");
  await page
    .getByRole("button", { name: account.home.rejected.action })
    .click();
  await expect(page).toHaveURL(/\/account\/login\?reason=signed_out/, {
    timeout: 10_000,
  });
  await expect(page.getByLabel("Email")).toBeVisible();
});

test("an ended session keeps the attempt for the same account to resend", async ({
  page,
  context,
}) => {
  const email = uniqueEmail("expired");
  await signUpAndConfirm(page, email);
  await anonymousAnswers(page, "Eve Expiring", email);
  await adoptAndReview(page, "Eve Expiring");
  const cookies = await context.cookies();
  await context.addCookies(
    cookies
      .filter((c) => c.name.startsWith("cosmos-client-auth"))
      .map((c) => ({ ...c, value: "base64-eyJleHBpcmVkIjp0cnVlfQ" })),
  );
  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(page.getByText(account.quote.sessionEnded)).toBeVisible();
  expect((await stubState(page, email)).requests).toBe(0);

  await signIn(page, email);
  await page.goto("/quote");
  await expect(page.getByText("Eve Expiring")).toBeVisible();
  await page.getByRole("button", { name: /Send my request|Try again/ }).click();
  await expect(
    page.getByRole("heading", { name: "Thank you. Your request is in." }),
  ).toBeVisible();
  expect((await stubState(page, email)).requests).toBe(1);
});
