import { expect, test, type Page } from "@playwright/test";

const heading = (page: Page, name: string) =>
  expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
const choose = (page: Page, name: RegExp | string) =>
  page.getByRole("radio", { name, exact: typeof name === "string" }).check();
const next = (page: Page) =>
  page.getByRole("button", { name: "Continue" }).click();

/** Answer a regular home clean up to the review screen. */
async function answerHomeQuote(page: Page) {
  await page.goto("/quote");
  await heading(page, "What can we help with?");
  await choose(page, /^Regular home cleaning/);
  await next(page);

  await heading(page, "What kind of property?");
  await choose(page, "House");
  await next(page);

  await heading(page, "How big is the home?");
  await page
    .getByRole("radiogroup", { name: "Bedrooms" })
    .getByRole("radio", { name: "3" })
    .check();
  await next(page);
  await expect(page.locator(".quote-card").getByRole("alert")).toHaveText(
    "Choose the number of bathrooms.",
  );
  await page
    .getByRole("radiogroup", { name: "Bathrooms" })
    .getByRole("radio", { name: "2" })
    .check();
  await next(page);

  await heading(page, "How often would you like us?");
  await choose(page, "Every two weeks");
  await next(page);

  await heading(page, "How does it look today?");
  await choose(page, /^Well kept/);
  await next(page);

  await heading(page, "Where is the property?");
  await page.getByLabel("ZIP code").fill("7870");
  await next(page);
  await expect(page.locator(".quote-card").getByRole("alert")).toHaveText(
    "Enter a 5-digit ZIP code.",
  );
  await page.getByLabel("ZIP code").fill("78701");
  await expect(page.getByText(/That's in Texas/)).toBeVisible();
  await next(page);

  await heading(page, "When would you like us to start?");
  await choose(page, "Within two weeks");
  await next(page);

  await heading(page, "Anything we should know?");
  await page.getByRole("checkbox", { name: "Pets at home" }).check();
  await page.getByLabel("Notes").fill("Side gate is open.");
  await next(page);

  await heading(page, "Where should we send your quote?");
  await page.getByLabel("Name").fill("Alex Rivera");
  await page.getByLabel("Email").fill("alex@");
  await next(page);
  await expect(page.locator(".quote-card").getByRole("alert")).toHaveText(
    "Enter a valid email address.",
  );
  await page.getByLabel("Email").fill("alex@example.com");
  await next(page);

  await heading(page, "Check your answers");
}

test("a home quote, start to review", async ({ page }) => {
  await answerHomeQuote(page);
  const review = page.locator(".quote-review");
  await expect(review).toContainText("Regular home cleaning");
  await expect(review).toContainText("3 bedrooms, 2 bathrooms");
  await expect(review).toContainText("Every two weeks");
  await expect(review).toContainText("Pets at home. Side gate is open.");

  // Back keeps every answer.
  await page.getByRole("button", { name: "Back" }).click();
  await heading(page, "Where should we send your quote?");
  await expect(page.getByLabel("Email")).toHaveValue("alex@example.com");
});

test("says honestly when requests aren't connected", async ({ page }) => {
  await answerHomeQuote(page);
  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(page.locator(".quote-card").getByRole("alert")).toContainText(
    "Online quote requests aren't connected, so nothing was sent.",
  );
  await expect(page.getByText("Thank you")).toHaveCount(0);

  // The draft survives a reload.
  await page.reload();
  await heading(page, "Check your answers");
  await expect(page.locator(".quote-review")).toContainText("Alex Rivera");
});

test("thanks the visitor only once the request is delivered", async ({
  page,
}) => {
  let body: Record<string, unknown> | undefined;
  await page.route("**/api/quote", async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({ json: { ok: true, id: "test" } });
  });
  await answerHomeQuote(page);
  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(
    page.getByRole("heading", { name: "Thank you. Your request is in." }),
  ).toBeFocused();
  expect(body).toMatchObject({
    service: "regular",
    zip: "78701",
    email: "alex@example.com",
  });
});

test("a workplace link opens the workplace questions", async ({ page }) => {
  await page.goto("/quote?service=office");
  await heading(page, "What kind of workplace?");
  await choose(page, "Office");
  await next(page);
  await heading(page, "About how big is the space?");
  await expect(page.getByRole("radio", { name: /sq ft/ })).toHaveCount(4);
});

test("a quote in progress can be shared without personal details", async ({
  page,
  browser,
}) => {
  await answerHomeQuote(page);
  const shared = page.url();
  expect(shared).toContain("service=regular");
  expect(shared).toContain("bedrooms=3");
  for (const secret of ["78701", "alex", "Side"]) {
    expect(shared).not.toContain(secret);
  }

  // Someone else opens the link in a fresh browser: the choices carry over
  // and they continue from the first question the link leaves open.
  const other = await browser.newContext();
  const theirs = await other.newPage();
  await theirs.goto(shared);
  await heading(theirs, "Where is the property?");
  await theirs.getByRole("button", { name: "Back" }).click();
  await heading(theirs, "How does it look today?");
  await expect(theirs.getByRole("radio", { name: /^Well kept/ })).toBeChecked();
  await other.close();
});
