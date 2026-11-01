import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type Route,
} from "@playwright/test";
import { account } from "../../src/lib/site";
import { homeQuote } from "../unit/fixtures";
import { choicesLink, finishQuestions, storedText } from "./quote-helpers";

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
const SENT = "Thank you. Your request is in.";

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

/** The mock refuses this account's session, as a revoked one would be. */
async function rejectSession(page: Page, email: string, rejected = true) {
  await page.request.post(
    `${STUB}/__stub/reject?email=${encodeURIComponent(email)}&rejected=${rejected}`,
  );
}

/** The mock fails like a wrong server credential (contract 2.2), for one account. */
async function serviceAuth(page: Page, email: string, failing: boolean) {
  await page.request.post(
    `${STUB}/__stub/service-auth?email=${encodeURIComponent(email)}&failing=${failing}`,
  );
}

/** Full answers in this tab: what an earlier version stored before sign-in. */
async function anonymousAnswers(page: Page, name: string, email: string) {
  await page.goto("/");
  await page.evaluate(
    (draft) =>
      sessionStorage.setItem("cosmos-quote-draft", JSON.stringify(draft)),
    { answers: { ...homeQuote, name, email }, step: "review" },
  );
}

/** Open the quote, take over the waiting choices, finish, arrive at review. */
async function adoptAndReview(page: Page, name: string, email: string) {
  await page.goto("/quote");
  await expect(
    page.getByRole("heading", { name: account.quote.adoptTitle }),
  ).toBeVisible();
  await page.getByRole("button", { name: account.quote.adopt }).click();
  // Only choices came across: nothing personal is carried through sign-in.
  await expect(page.getByLabel("ZIP code")).toHaveValue("");
  await expect(page.getByText(name)).toHaveCount(0);
  await finishQuestions(page, { name, email });
  await expect(page.getByText(name)).toBeVisible();
}

/** What's left of an attempt whose outcome is unknown. */
const noteTitle = account.quote.unresolvedTitle;

/** Counts sends from this page, for "nothing was sent". */
function countSends(page: Page) {
  const sends = { count: 0 };
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/quote") sends.count += 1;
  });
  return sends;
}

/** A committed request whose answer was lost, then a sign-out. Returns its ID. */
async function unconfirmedThenSignedOut(
  page: Page,
  name: string,
  email: string,
) {
  await anonymousAnswers(page, name, email);
  await adoptAndReview(page, name, email);
  await failNextIntake(page, email);
  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(
    page.getByText("We couldn't confirm that your request was saved."),
  ).toBeVisible();
  const { submissions } = await stubState(page, email);
  await signOut(page);
  return submissions[0];
}

/** Everything a blocked client sees, and nothing they could send with. */
async function expectBlocked(page: Page, id: string) {
  await expect(page.getByRole("heading", { name: noteTitle })).toBeVisible();
  await expect(page.getByText(id)).toBeVisible();
  await expect(page.getByLabel("ZIP code")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Send my request|Try again/ }),
  ).toHaveCount(0);
}

async function startSeparate(page: Page) {
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Start a separate request" }).click();
  await expect(page.getByRole("heading", { name: noteTitle })).toHaveCount(0);
}

/** A sent request, open on its detail page. Returns the page's path. */
async function requestOpen(page: Page, name: string, email: string) {
  await anonymousAnswers(page, name, email);
  await adoptAndReview(page, name, email);
  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(page.getByRole("heading", { name: SENT })).toBeVisible();
  await page.goto("/account");
  await page.getByRole("link", { name: "Details" }).click();
  await expect(page).toHaveURL(/\/account\/requests\//);
  await expect(page.getByText(name)).toBeVisible();
  return new URL(page.url()).pathname;
}

/** As if the new account landed on a page that can't announce itself. */
const missOwnerSignal = (page: Page) =>
  page.addInitScript(() =>
    window.addEventListener("storage", (event) => {
      if (event.key === "cosmos-account-owner")
        event.stopImmediatePropagation();
    }),
  );

/** Another tab's sign-out as it starts, while the cookies are still valid. */
async function signalSignOut(context: BrowserContext) {
  const other = await context.newPage();
  await other.goto("/");
  await other.evaluate(() =>
    localStorage.setItem("cosmos-quote-signed-out", String(Date.now())),
  );
}

/** Holds this page's owner checks; release answers them, abort fails them. */
async function holdOwnerChecks(page: Page) {
  const held: Route[] = [];
  await page.route("**/account/session", (route) => {
    held.push(route);
  });
  const finish = async (answer: (route: Route) => Promise<void>) => {
    for (const route of held.splice(0)) await answer(route);
    await page.unroute("**/account/session");
  };
  return {
    release: () => finish((route) => route.continue()),
    fail: () => finish((route) => route.abort()),
    count: () => held.length,
  };
}

/** Counts this tab's page loads, for "it did not reload". */
function countLoads(page: Page) {
  const loads = { count: 0 };
  page.on("load", () => {
    loads.count += 1;
  });
  return loads;
}

const windowFocus = (page: Page) =>
  page.evaluate(() => window.dispatchEvent(new Event("focus")));

const history = (page: Page, type: "pagehide" | "pageshow") =>
  page.evaluate(
    (name) =>
      window.dispatchEvent(new PageTransitionEvent(name, { persisted: true })),
    type,
  );

/** The tab goes to the background, or comes back. */
async function tabIs(page: Page, state: "hidden" | "visible") {
  await page.evaluate((value) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => value,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }, state);
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
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: account.signUp.submit }).click();
  await expect(page.getByText(email)).toBeVisible();

  const tab = await context.newPage();
  await tab.goto(await emailLink(page, email));
  await expect(tab).toHaveURL(/\/quote(\?|$)/);
  await adoptAndReview(tab, "Ada Newcomer", email);
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
  await adoptAndReview(page, "Rita Retry", email);

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
  await adoptAndReview(page, "Rita Again", email);
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
  await adoptAndReview(page, "Tess Tabs", email);

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
  await missOwnerSignal(page);
  const alice = uniqueEmail("alice");
  const bob = uniqueEmail("bob");
  await signUpAndConfirm(page, bob);
  await signOut(page);
  await signUpAndConfirm(page, alice);
  await anonymousAnswers(page, "Alice Private", alice);
  await adoptAndReview(page, "Alice Private", alice);

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

test("a switch takes the answers off the quote before anything is sent", async ({
  page,
  context,
}) => {
  const alice = uniqueEmail("quote-a");
  const bob = uniqueEmail("quote-b");
  await signUpAndConfirm(page, bob);
  await signOut(page);
  await signUpAndConfirm(page, alice);
  await anonymousAnswers(page, "Alice Quoted", alice);
  await adoptAndReview(page, "Alice Quoted", alice);

  // Nobody presses anything on this tab.
  await context.clearCookies();
  const other = await context.newPage();
  await signIn(other, bob);
  await expect(page.getByText("Alice Quoted")).toHaveCount(0);
  // Bob's quote starts clean: not even Alice's choices come across in the URL.
  await expect(page).toHaveURL(/\/quote$/);
  expect(await storedText(page)).not.toContain("Alice Quoted");
  expect((await stubState(page, alice)).requests).toBe(0);
  expect((await stubState(page, bob)).requests).toBe(0);
});

test("the quote stays hidden on every return until the owner is confirmed", async ({
  page,
  context,
}) => {
  await missOwnerSignal(page);
  const alice = uniqueEmail("return-a");
  await signUpAndConfirm(page, alice);
  await anonymousAnswers(page, "Alice Returning", alice);
  await adoptAndReview(page, "Alice Returning", alice);
  const answers = page.getByText("Alice Returning");
  const loads = countLoads(page);

  // The same client gets their answers back, in place, each way.
  await tabIs(page, "hidden");
  await expect(answers).toBeHidden();
  await tabIs(page, "visible");
  await expect(answers).toBeVisible();

  let checks = await holdOwnerChecks(page);
  await windowFocus(page);
  await expect(answers).toBeHidden();
  await expect.poll(checks.count).toBeGreaterThan(0);
  await expect(answers).toBeHidden();
  await checks.release();
  await expect(answers).toBeVisible();

  await history(page, "pagehide");
  await expect(answers).toBeHidden();
  await history(page, "pageshow");
  await expect(answers).toBeVisible();

  checks = await holdOwnerChecks(page);
  await windowFocus(page);
  await expect.poll(checks.count).toBeGreaterThan(0);
  await checks.fail();
  await expect(page.getByText(account.privacy.unconfirmed)).toBeVisible();
  await expect(answers).toBeHidden();
  await page.getByRole("button", { name: account.privacy.retry }).click();
  await expect(answers).toBeVisible();
  expect(loads.count).toBe(0);

  // Then the session goes while the tab is away, and history brings it back.
  await history(page, "pagehide");
  await context.clearCookies();
  await history(page, "pageshow");
  await expect(answers).toHaveCount(0);
  await expect(page).toHaveURL(/\/quote$/);
  expect(await storedText(page)).not.toContain("Alice Returning");
});

test("a sign-out signal on the quote waits for proof, whatever the first check says", async ({
  page,
  context,
}) => {
  const email = uniqueEmail("quote-race");
  await signUpAndConfirm(page, email);
  await anonymousAnswers(page, "Quinn Race", email);
  await adoptAndReview(page, "Quinn Race", email);
  let checks = 0;
  await page.route("**/account/session", (route) => {
    checks += 1;
    return checks === 1 ? route.abort() : route.continue();
  });
  const loads = countLoads(page);

  await signalSignOut(context);
  await expect(page.getByText("Quinn Race")).toHaveCount(0);
  await expect.poll(() => checks).toBeGreaterThan(2);
  expect(loads.count).toBe(0);
  await expect(page.getByText("Quinn Race")).toHaveCount(0);

  await context.clearCookies();
  await expect.poll(() => loads.count).toBe(1);
  await expect(page).toHaveURL(/\/quote$/);
  await expect(page.getByText("Quinn Race")).toHaveCount(0);
});

test("a switch keeps an unresolved attempt's ID for its owner, and sends nothing", async ({
  page,
  context,
}) => {
  const alice = uniqueEmail("keep-a");
  const bob = uniqueEmail("keep-b");
  await signUpAndConfirm(page, bob);
  await signOut(page);
  await signUpAndConfirm(page, alice);
  await anonymousAnswers(page, "Alice Unresolved", alice);
  await adoptAndReview(page, "Alice Unresolved", alice);
  await failNextIntake(page, alice);
  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(
    page.getByText("We couldn't confirm that your request was saved."),
  ).toBeVisible();
  const before = await stubState(page, alice);

  await context.clearCookies();
  const other = await context.newPage();
  await signIn(other, bob);
  await expect(page.getByText("Alice Unresolved")).toHaveCount(0);
  await expect(other.getByText("Alice Unresolved")).toHaveCount(0);
  expect((await stubState(page, bob)).requests).toBe(0);

  await other.close();
  await context.clearCookies();
  await signIn(page, alice);
  await page.goto("/quote");
  await expectBlocked(page, before.submissions[0]);
  await expect(page.getByText("Alice Unresolved")).toHaveCount(0);
  expect(await stubState(page, alice)).toEqual(before);
});

test("after sign-out only the attempt's ID stays, for its own account, and sending stops", async ({
  page,
}) => {
  const alice = uniqueEmail("keep-a");
  const bob = uniqueEmail("keep-b");
  await signUpAndConfirm(page, bob);
  await signOut(page);
  await signUpAndConfirm(page, alice);
  const id = await unconfirmedThenSignedOut(page, "Alice Pending", alice);

  const after = await storedText(page);
  for (const value of [
    "Alice Pending",
    alice,
    homeQuote.phone,
    homeQuote.notes,
  ])
    expect(after).not.toContain(value);
  expect(after).toContain(id);

  // Bob sees nothing of it, and isn't held up by it.
  await signIn(page, bob);
  await page.goto("/quote");
  await expect(page.getByRole("heading", { name: noteTitle })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);

  await signOut(page);
  await signIn(page, alice);
  const sends = countSends(page);
  await page.goto("/quote");
  await expectBlocked(page, id);
  // A link's answers don't get past it, and neither does a reload.
  await page.goto(choicesLink);
  await expectBlocked(page, id);
  await page.reload();
  await expectBlocked(page, id);
  expect(sends.count).toBe(0);

  await page
    .getByRole("link", { name: account.quote.unresolvedAccount })
    .click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText("Request received")).toBeVisible();
  expect((await stubState(page, alice)).requests).toBe(1);
});

test("a conflict is never a receipt: the attempt stays unresolved", async ({
  page,
}) => {
  const email = uniqueEmail("conflict");
  await signUpAndConfirm(page, email);
  await anonymousAnswers(page, "Cleo Conflict", email);
  await adoptAndReview(page, "Cleo Conflict", email);
  await page.route("**/api/quote", (route) =>
    route.fulfill({
      status: 409,
      json: { ok: false, code: "idempotency_conflict" },
    }),
  );
  const conflict = "We can't match this request ID to its earlier attempt";
  const sent = page.waitForRequest("**/api/quote");
  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(page.getByText(conflict)).toBeVisible();
  const { submission_id } = (await sent).postDataJSON();
  await expect(page.getByRole("heading", { name: SENT })).toHaveCount(0);
  expect(await storedText(page)).toContain(submission_id);

  // It survives a reload with its answers, and a retry is still a conflict.
  await page.reload();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText(conflict)).toBeVisible();
  await page.unroute("**/api/quote");

  // After sign-out the marker keeps it unresolved.
  await signOut(page);
  await signIn(page, email);
  await page.goto("/quote");
  await expectBlocked(page, submission_id);
  expect((await stubState(page, email)).requests).toBe(0);
});

test("only a validated receipt completes a request", async ({ page }) => {
  const email = uniqueEmail("receipt");
  await signUpAndConfirm(page, email);
  await anonymousAnswers(page, "Rex Receipt", email);
  await adoptAndReview(page, "Rex Receipt", email);
  const first = page.waitForRequest("**/api/quote");
  for (const [index, reply] of [
    { status: 202, json: { ok: true } },
    { status: 200, json: { ok: true, id: "not-a-receipt" } },
    { status: 202, json: { ok: true, receipt_id: "bad", status: "received" } },
  ].entries()) {
    await page.route("**/api/quote", (route) => route.fulfill(reply), {
      times: 1,
    });
    await page
      .getByRole("button", { name: index ? "Try again" : "Send my request" })
      .click();
    await expect(
      page.getByText("We couldn't confirm that your request was saved."),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: SENT })).toHaveCount(0);
  }
  const { submission_id } = (await first).postDataJSON();
  expect(await storedText(page)).toContain(submission_id);

  const real = page.waitForRequest("**/api/quote");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: SENT })).toBeVisible();
  expect((await real).postDataJSON().submission_id).toBe(submission_id);
  expect(await storedText(page)).not.toContain(submission_id);
  expect((await stubState(page, email)).requests).toBe(1);
});

test("a send the edge limits keeps its attempt and resends nothing", async ({
  page,
}) => {
  const email = uniqueEmail("limited");
  await signUpAndConfirm(page, email);
  await anonymousAnswers(page, "Lia Limited", email);
  await adoptAndReview(page, "Lia Limited", email);
  const sends = countSends(page);
  await page.route(
    "**/api/quote",
    (route) =>
      route.fulfill({
        status: 429,
        contentType: "text/plain",
        body: "Too Many Requests",
      }),
    { times: 1 },
  );
  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(page.getByText("Too many attempts were made.")).toBeVisible();
  await page.waitForTimeout(1_000);
  expect(sends.count).toBe(1);
  await expect(page.getByText("Lia Limited")).toBeVisible();

  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: SENT })).toBeVisible();
  expect((await stubState(page, email)).requests).toBe(1);
});

test("age doesn't remove a marker or allow a new ID", async ({ page }) => {
  const email = uniqueEmail("aged");
  await signUpAndConfirm(page, email);
  const id = await unconfirmedThenSignedOut(page, "Ada Aged", email);
  await signIn(page, email);

  const sends = countSends(page);
  // Well past the old limit, seen by a sweep from each kind of page.
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage))
      if (key.startsWith("cosmos-quote-attempt:")) {
        const record = JSON.parse(localStorage.getItem(key)!);
        record.savedAt = Date.now() - 400 * 24 * 60 * 60 * 1000;
        localStorage.setItem(key, JSON.stringify(record));
      }
  });
  await page.goto("/");
  await page.goto("/account");
  await page.goto("/quote");
  await expectBlocked(page, id);
  await page.reload();
  await expectBlocked(page, id);
  expect(sends.count).toBe(0);
  expect((await stubState(page, email)).requests).toBe(1);
});

test("a marker clears only on a confirmed separate request, which is a new ID", async ({
  page,
}) => {
  const email = uniqueEmail("separate");
  await signUpAndConfirm(page, email);
  const first = await unconfirmedThenSignedOut(page, "Sam Separate", email);
  await signIn(page, email);
  await page.goto("/quote");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Start a separate request" }).click();
  await expectBlocked(page, first);
  await page.reload();
  await expectBlocked(page, first);

  await startSeparate(page);
  await page.goto(choicesLink);
  await finishQuestions(page, { name: "Sam Second", email });
  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(page.getByRole("heading", { name: SENT })).toBeVisible();
  const { requests, submissions } = await stubState(page, email);
  expect(requests).toBe(2);
  expect(submissions).toContain(first);
  expect(new Set(submissions).size).toBe(2);
});

test("a signed-out visitor is asked only for choices, and stores nothing else", async ({
  page,
}) => {
  await page.goto(`${choicesLink}&timing=asap`);
  // The link's choices are done, so the next screen is the account gate.
  await expect(
    page.getByRole("heading", { name: account.quote.title }),
  ).toBeVisible();
  await expect(page.getByLabel("ZIP code")).toHaveCount(0);
  await expect(page.getByLabel("Name")).toHaveCount(0);
  await expect(page.getByText("Step 6 of 6")).toBeVisible();

  await page.getByRole("link", { name: account.quote.create }).click();
  await expect(page).toHaveURL(/\/account\/signup\?next=%2Fquote$/);
  const handoff = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cosmos-quote-handoff")!),
  );
  expect(handoff.version).toBe(2);
  expect(handoff.answers).toMatchObject({
    service: "regular",
    name: "",
    email: "",
    phone: "",
    notes: "",
    extras: [],
  });
  expect(handoff.answers.zip).toBeUndefined();
  expect(handoff.answers.timing).toBeUndefined();
});

test("sensitive data an earlier version stored is removed", async ({
  page,
}) => {
  const legacy = { answers: homeQuote, step: "review" };
  await page.goto("/");
  await page.evaluate(
    ({ legacy, attempt }) => {
      localStorage.setItem(
        "cosmos-quote-handoff",
        JSON.stringify({ version: 1, savedAt: Date.now(), draft: legacy }),
      );
      sessionStorage.setItem("cosmos-quote-draft", JSON.stringify(legacy));
      sessionStorage.setItem("cosmos-quote-attempt", JSON.stringify(attempt));
    },
    {
      legacy,
      attempt: { submission_id: crypto.randomUUID(), answers: homeQuote },
    },
  );
  // A marketing page clears the handoff, without knowing who is signed in.
  await page.goto("/");
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("cosmos-quote-handoff")),
    )
    .toBeNull();
  // The sign-in page knows nobody is, and clears the tab too.
  await page.goto("/account/login");
  await expect.poll(() => storedText(page)).not.toContain(homeQuote.email);
  expect(await storedText(page)).not.toContain(homeQuote.notes);
});

test("a refused server credential reads as temporary, keeps the session and the attempt", async ({
  page,
}) => {
  const email = uniqueEmail("service");
  await signUpAndConfirm(page, email);
  await anonymousAnswers(page, "Sid Service", email);
  await adoptAndReview(page, "Sid Service", email);
  await serviceAuth(page, email, true);

  const first = page.waitForRequest("**/api/quote");
  const refused = page.waitForResponse("**/api/quote");
  await page.getByRole("button", { name: "Send my request" }).click();
  const response = await refused;
  expect(response.status()).toBe(503);
  // Nothing about the credential reaches the browser.
  expect(await response.json()).toEqual({ ok: false, code: "unavailable" });
  await expect(
    page.getByText(account.quote.temporarilyUnavailable),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: account.quote.sessionEndedTitle }),
  ).toHaveCount(0);
  await expect(page.getByText("Sid Service")).toBeVisible();

  // The account page and sign-in don't ask for a new session either.
  await page.goto("/account");
  await expect(page.getByText(account.home.unavailable.title)).toBeVisible();
  await expect(page.getByText(account.home.rejected.title)).toHaveCount(0);
  await page.goto("/account/login?next=%2Fquote");
  await expect(page).toHaveURL(/\/quote/);

  // The same attempt, unchanged, once it recovers.
  await serviceAuth(page, email, false);
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  const again = page.waitForRequest("**/api/quote");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: SENT })).toBeVisible();
  expect((await again).postDataJSON().submission_id).toBe(
    (await first).postDataJSON().submission_id,
  );
  expect((await stubState(page, email)).requests).toBe(1);
});

test("another customer's request reads as not found", async ({ page }) => {
  const alice = uniqueEmail("owner-a");
  const bob = uniqueEmail("owner-b");
  await signUpAndConfirm(page, bob);
  await signOut(page);
  await signUpAndConfirm(page, alice);
  await anonymousAnswers(page, "Alice Owner", alice);
  await adoptAndReview(page, "Alice Owner", alice);
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

test("a private page in another tab clears at sign-out and stays gone for the next client", async ({
  page,
  context,
}) => {
  const alice = uniqueEmail("tab-a");
  const bob = uniqueEmail("tab-b");
  await signUpAndConfirm(page, bob);
  await signOut(page);
  await signUpAndConfirm(page, alice);
  const detail = await requestOpen(page, "Alice Retained", alice);

  const other = await context.newPage();
  await signOut(other);
  // No click here: the signal from the other tab clears this page.
  await expect(page.getByText("Alice Retained")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: account.signIn.title }),
  ).toBeVisible();

  expect(await storedText(other)).not.toContain("cosmos-account-owner");

  await signIn(other, bob);
  await page.bringToFront();
  await expect(page.getByText("Alice Retained")).toHaveCount(0);
  await other.goto(detail);
  await expect(
    other.getByRole("heading", { name: account.request.notFound.title }),
  ).toBeVisible();
  await expect(other.getByText("Alice Retained")).toHaveCount(0);
});

test("the signal hides a private page before sign-out has finished", async ({
  page,
  context,
}) => {
  const email = uniqueEmail("tab-race");
  await signUpAndConfirm(page, email);
  await requestOpen(page, "Tess Race", email);

  // Sign-out signals as it starts, while the cookies are still valid.
  await signalSignOut(context);
  await expect(page.getByText("Tess Race")).toHaveCount(0);
  await context.clearCookies();
  await expect(
    page.getByRole("heading", { name: account.signIn.title }),
  ).toBeVisible();
  await expect(page.getByText("Tess Race")).toHaveCount(0);
});

test("a tab that returns after a switch with no signal never shows the old account", async ({
  page,
  context,
}) => {
  await missOwnerSignal(page);
  const alice = uniqueEmail("switch-a");
  const bob = uniqueEmail("switch-b");
  await signUpAndConfirm(page, bob);
  await signOut(page);
  await signUpAndConfirm(page, alice);
  await requestOpen(page, "Alice Switched", alice);

  await tabIs(page, "hidden");
  await expect(page.getByText("Alice Switched")).toBeHidden();
  await context.clearCookies();
  const other = await context.newPage();
  await signIn(other, bob);

  await tabIs(page, "visible");
  await expect(
    page.getByRole("heading", { name: account.request.notFound.title }),
  ).toBeVisible();
  await expect(page.getByText("Alice Switched")).toHaveCount(0);
});

test("focus hides the page before it asks, and a failed check keeps it hidden", async ({
  page,
}) => {
  const email = uniqueEmail("focus");
  await signUpAndConfirm(page, email);
  await requestOpen(page, "Fay Focus", email);
  const loads = countLoads(page);

  const checks = await holdOwnerChecks(page);
  await windowFocus(page);
  await expect(page.getByText("Fay Focus")).toBeHidden();
  await expect.poll(checks.count).toBeGreaterThan(0);
  await checks.fail();
  await expect(page.getByText(account.privacy.unconfirmed)).toBeVisible();
  await expect(page.getByText("Fay Focus")).toBeHidden();

  await page.getByRole("button", { name: account.privacy.retry }).click();
  await expect(page.getByText("Fay Focus")).toBeVisible();
  await expect(page.getByText(account.privacy.unconfirmed)).toHaveCount(0);
  expect(loads.count).toBe(0);
});

test("focus catches a switch on a tab that never left the screen", async ({
  page,
  context,
}) => {
  await missOwnerSignal(page);
  const alice = uniqueEmail("focus-a");
  const bob = uniqueEmail("focus-b");
  await signUpAndConfirm(page, bob);
  await signOut(page);
  await signUpAndConfirm(page, alice);
  await requestOpen(page, "Fay Switched", alice);

  await context.clearCookies();
  const other = await context.newPage();
  await signIn(other, bob);
  const checks = await holdOwnerChecks(page);
  await windowFocus(page);
  await expect(page.getByText("Fay Switched")).toBeHidden();
  await expect.poll(checks.count).toBeGreaterThan(0);
  await expect(page.getByText("Fay Switched")).toBeHidden();
  await checks.release();
  await expect(
    page.getByRole("heading", { name: account.request.notFound.title }),
  ).toBeVisible();
  await expect(page.getByText("Fay Switched")).toHaveCount(0);
});

test("a new account arriving beside an open tab clears it with no tab change", async ({
  page,
  context,
}) => {
  const alice = uniqueEmail("beside-a");
  const bob = uniqueEmail("beside-b");
  await signUpAndConfirm(page, bob);
  await signOut(page);
  await signUpAndConfirm(page, alice);
  await requestOpen(page, "Alice Beside", alice);

  await context.clearCookies();
  const other = await context.newPage();
  await signIn(other, bob);
  await expect(
    page.getByRole("heading", { name: account.request.notFound.title }),
  ).toBeVisible();
  await expect(page.getByText("Alice Beside")).toHaveCount(0);
});

test("an unknown owner never ends the wait for sign-out", async ({
  page,
  context,
}) => {
  const email = uniqueEmail("unknown");
  await signUpAndConfirm(page, email);
  await requestOpen(page, "Uma Unknown", email);
  let checks = 0;
  await page.route("**/account/session", (route) => {
    checks += 1;
    return checks === 1 ? route.abort() : route.continue();
  });
  const loads = countLoads(page);

  await signalSignOut(context);
  await expect(page.getByText("Uma Unknown")).toHaveCount(0);
  // The check has recovered and still sees this client: sign-out isn't done.
  await expect.poll(() => checks).toBeGreaterThan(2);
  expect(loads.count).toBe(0);
  await expect(page.getByText("Uma Unknown")).toHaveCount(0);

  await context.clearCookies();
  await expect(
    page.getByRole("heading", { name: account.signIn.title }),
  ).toBeVisible();
  await expect(page.getByText("Uma Unknown")).toHaveCount(0);
});

test("through a total outage after sign-out the page stays gone", async ({
  page,
  context,
}) => {
  const email = uniqueEmail("outage");
  await signUpAndConfirm(page, email);
  await requestOpen(page, "Otto Outage", email);
  await page.route("**/account/session", (route) => route.abort());
  const loads = countLoads(page);

  await signalSignOut(context);
  await expect(page.getByText("Otto Outage")).toHaveCount(0);
  await expect(page.getByText(account.privacy.unconfirmed)).toBeVisible({
    timeout: 15_000,
  });
  expect(loads.count).toBe(0);

  // Still unknown: trying again shows nothing.
  await page.getByRole("button", { name: account.privacy.retry }).click();
  await expect(page.getByText(account.privacy.unconfirmed)).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Otto Outage")).toHaveCount(0);
  expect(loads.count).toBe(0);

  await page.unroute("**/account/session");
  await context.clearCookies();
  await page.getByRole("button", { name: account.privacy.retry }).click();
  await expect(
    page.getByRole("heading", { name: account.signIn.title }),
  ).toBeVisible();
  await expect(page.getByText("Otto Outage")).toHaveCount(0);
});

test("a sign-out that never lands doesn't bring the page back by itself", async ({
  page,
  context,
}) => {
  const email = uniqueEmail("no-landing");
  await signUpAndConfirm(page, email);
  await requestOpen(page, "Nell Lands", email);
  const loads = countLoads(page);

  await signalSignOut(context);
  await expect(page.getByText(account.privacy.unconfirmed)).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Nell Lands")).toHaveCount(0);
  expect(loads.count).toBe(0);
});

test("a page restored from history checks first", async ({ page, context }) => {
  const email = uniqueEmail("restored");
  await signUpAndConfirm(page, email);
  await requestOpen(page, "Rae Restored", email);

  await history(page, "pagehide");
  await expect(page.getByText("Rae Restored")).toBeHidden();
  await context.clearCookies();
  await history(page, "pageshow");
  await expect(
    page.getByRole("heading", { name: account.signIn.title }),
  ).toBeVisible();
  await expect(page.getByText("Rae Restored")).toHaveCount(0);
});

test("back after signing out shows nothing private", async ({ page }) => {
  const email = uniqueEmail("back");
  await signUpAndConfirm(page, email);
  await requestOpen(page, "Bo Back", email);

  await page.getByRole("link", { name: account.request.back }).click();
  await expect(page).toHaveURL(/\/account$/);
  await page.getByRole("button", { name: account.home.signOut }).click();
  await expect(page).toHaveURL(
    /\/account\/login\?reason=signed_out(_local)?$/,
    {
      timeout: 10_000,
    },
  );

  await page.goBack();
  await expect(page.getByText(email)).toHaveCount(0);
  await page.goBack();
  await expect(page.getByText("Bo Back")).toHaveCount(0);
  await expect(page).toHaveURL(/\/account\/login/);
  await page.goForward();
  await expect(page.getByText("Bo Back")).toHaveCount(0);
});

test("the same client coming back keeps the page, and can move around it", async ({
  page,
}) => {
  const email = uniqueEmail("same");
  await signUpAndConfirm(page, email);
  const detail = await requestOpen(page, "Sam Same", email);
  await page.evaluate(() => {
    (window as unknown as { sameDocument: boolean }).sameDocument = true;
  });
  await page.getByRole("link", { name: account.request.back }).focus();

  await tabIs(page, "hidden");
  await expect(page.getByText("Sam Same")).toBeHidden();
  await tabIs(page, "visible");
  await expect(page.getByText("Sam Same")).toBeVisible();
  await expect(
    page.getByRole("link", { name: account.request.back }),
  ).toBeFocused();
  // Shown again in place: no reload, nothing left of the check.
  expect(
    await page.evaluate(
      () => (window as unknown as { sameDocument?: boolean }).sameDocument,
    ),
  ).toBe(true);

  await page.getByRole("link", { name: account.request.back }).click();
  await expect(page).toHaveURL(/\/account$/);
  await page.getByRole("link", { name: "Details" }).click();
  await expect(page).toHaveURL(new RegExp(`${detail}$`));
  await expect(page.getByText("Sam Same")).toBeVisible();
});

test("a check that can't finish keeps the page hidden until one does", async ({
  page,
}) => {
  const email = uniqueEmail("offline");
  await signUpAndConfirm(page, email);
  await requestOpen(page, "Olive Offline", email);

  await page.route("**/account/session", (route) => route.abort());
  await tabIs(page, "hidden");
  await tabIs(page, "visible");
  await expect(page.getByText(account.privacy.unconfirmed)).toBeVisible();
  await expect(page.getByText("Olive Offline")).toBeHidden();

  await page.unroute("**/account/session");
  await page.getByRole("button", { name: account.privacy.retry }).click();
  await expect(page.getByText("Olive Offline")).toBeVisible();
  await expect(page.getByText(account.privacy.unconfirmed)).toHaveCount(0);
});

test("a session the Studio refuses during a send needs a real new sign-in, without a loop", async ({
  page,
}) => {
  const email = uniqueEmail("quote-loop");
  await signUpAndConfirm(page, email);
  await anonymousAnswers(page, "Rae Revoked", email);
  await adoptAndReview(page, "Rae Revoked", email);
  await rejectSession(page, email);

  const send = page.waitForRequest("**/api/quote");
  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(
    page.getByRole("heading", { name: account.quote.sessionEndedTitle }),
  ).toBeVisible();
  const { submission_id } = (await send).postDataJSON();
  // The screen and storage are clear at once; only the ID stays.
  await expect(page.getByText("Rae Revoked")).toHaveCount(0);
  const stored = await storedText(page);
  for (const value of ["Rae Revoked", email, homeQuote.phone])
    expect(stored).not.toContain(value);
  expect(stored).toContain(submission_id);

  // Sign-in doesn't bounce to the quote while this session still verifies.
  const documents: string[] = [];
  page.on("framenavigated", (frame) => documents.push(frame.url()));
  await page.goto("/account/login?next=%2Fquote");
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/account\/login\?next=%2Fquote$/);
  await expect(page.getByText(account.home.rejected.title)).toBeVisible();
  expect(documents.length).toBeLessThan(3);

  // The way out is a real sign-out, keeping the destination.
  await page
    .getByRole("button", { name: account.home.rejected.action })
    .click();
  await expect(page).toHaveURL(
    /\/account\/login\?next=%2Fquote&reason=signed_out/,
    { timeout: 10_000 },
  );
  expect(
    (await page.context().cookies()).filter((c) =>
      /^cosmos-client-auth(\.\d+)?$/.test(c.name),
    ),
  ).toEqual([]);

  // A genuine new session, and the attempt stays unresolved: this browser
  // can't know what happened, so sending stops until the client decides.
  await rejectSession(page, email, false);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page
    .getByRole("button", { name: account.signIn.submit, exact: true })
    .click();
  await expect(page).toHaveURL(/\/quote(\?|$)/);
  await expectBlocked(page, submission_id);
  expect((await stubState(page, email)).requests).toBe(0);

  await startSeparate(page);
  await page.goto(choicesLink);
  await finishQuestions(page, { name: "Rae Revoked", email });
  const resend = page.waitForRequest("**/api/quote");
  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(page.getByRole("heading", { name: SENT })).toBeVisible();
  expect((await resend).postDataJSON().submission_id).not.toBe(submission_id);
  expect((await stubState(page, email)).requests).toBe(1);
});

test("a session the Studio rejects asks to sign in again, without a redirect loop", async ({
  page,
}) => {
  const email = uniqueEmail("rejected");
  await signUpAndConfirm(page, email);
  await rejectSession(page, email);
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

test("an ended session leaves only the ID, and stops sending until a decision", async ({
  page,
  context,
}) => {
  const email = uniqueEmail("expired");
  await signUpAndConfirm(page, email);
  await anonymousAnswers(page, "Eve Expiring", email);
  await adoptAndReview(page, "Eve Expiring", email);
  const cookies = await context.cookies();
  await context.addCookies(
    cookies
      .filter((c) => c.name.startsWith("cosmos-client-auth"))
      .map((c) => ({ ...c, value: "base64-eyJleHBpcmVkIjp0cnVlfQ" })),
  );
  const send = page.waitForRequest("**/api/quote");
  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(page.getByText(account.quote.sessionEnded)).toBeVisible();
  expect((await stubState(page, email)).requests).toBe(0);
  const { submission_id } = (await send).postDataJSON();

  await page
    .getByRole("button", { name: account.quote.sessionEndedAction })
    .click();
  await expect(page).toHaveURL(/\/account\/login\?next=%2Fquote/, {
    timeout: 10_000,
  });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page
    .getByRole("button", { name: account.signIn.submit, exact: true })
    .click();
  await expect(page).toHaveURL(/\/quote(\?|$)/);
  await expectBlocked(page, submission_id);
  await expect(page.getByText("Eve Expiring")).toHaveCount(0);
  await startSeparate(page);
  await page.goto(choicesLink);
  await finishQuestions(page, { name: "Eve Expiring", email });
  const resend = page.waitForRequest("**/api/quote");
  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(page.getByRole("heading", { name: SENT })).toBeVisible();
  expect((await resend).postDataJSON().submission_id).not.toBe(submission_id);
  expect((await stubState(page, email)).requests).toBe(1);
});
