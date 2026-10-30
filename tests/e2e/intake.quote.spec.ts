import { expect, test, type Page } from "@playwright/test";
import { homeQuote } from "../unit/fixtures";

async function review(page: Page) {
  await page.addInitScript((answers) => {
    if (!sessionStorage.getItem("cosmos-quote-draft"))
      sessionStorage.setItem(
        "cosmos-quote-draft",
        JSON.stringify({ answers, step: "review" }),
      );
  }, homeQuote);
  await page.goto("/quote");
  await expect(
    page.getByRole("heading", { name: "Check your answers" }),
  ).toBeVisible();
}
const send = (page: Page) =>
  page.getByRole("button", { name: "Send my request", exact: true }).click();
const retry = (page: Page) =>
  page.getByRole("button", { name: "Try again", exact: true }).click();
const receipt = {
  ok: true,
  receipt_id: "00000000-0000-4000-8000-000000000202",
  status: "received",
};

test("ambiguous failure, reload and retry retain the exact attempt until a committed receipt", async ({
  page,
}) => {
  const requests: unknown[] = [];
  await page.route("**/api/quote", (route) => {
    requests.push(route.request().postDataJSON());
    return requests.length === 1
      ? route.abort("failed")
      : route.fulfill({ status: 200, json: receipt });
  });
  await review(page);
  await send(page);
  await expect(
    page.getByText("We couldn't confirm that your request was saved.", {
      exact: true,
    }),
  ).toBeVisible();
  const original = await page.evaluate(() =>
    sessionStorage.getItem("cosmos-quote-attempt"),
  );
  expect(JSON.parse(original!).submission_id).toMatch(/^[0-9a-f-]{36}$/);
  await page.goto("/quote?service=office"); // A link cannot replace an unresolved submission.
  await expect(page.locator(".quote-review")).toContainText(
    "Regular home cleaning",
  );
  await expect(
    page.getByRole("button", { name: "Back", exact: true }),
  ).toBeDisabled();
  await retry(page);
  await expect(
    page.getByRole("heading", { name: "Thank you. Your request is in." }),
  ).toBeVisible();
  expect(requests[1]).toEqual(requests[0]);
  expect(
    await page.evaluate(() => sessionStorage.getItem("cosmos-quote-attempt")),
  ).toBeNull();
  expect(
    await page.evaluate(() => sessionStorage.getItem("cosmos-quote-draft")),
  ).toBeNull();
});

test("conflict preserves original attempt; a separate request requires an explicit decision", async ({
  page,
}) => {
  const requests: {
    submission_id: string;
    answers: Record<string, unknown>;
  }[] = [];
  await page.route("**/api/quote", (route) => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({
      status: 409,
      json: { ok: false, code: "idempotency_conflict" },
    });
  });
  await review(page);
  await send(page);
  await expect(page.locator(".quote-card").getByRole("alert")).toContainText(
    "already associated with different answers",
  );
  await retry(page);
  expect(requests[1]).toEqual(requests[0]);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "Start a separate request", exact: true })
    .click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(sessionStorage.getItem("cosmos-quote-attempt")!)
          .submission_id,
    ),
  ).toBe(requests[0].submission_id);
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Start a separate request", exact: true })
    .click();
  await page.getByLabel("Email", { exact: true }).fill("another@example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await send(page);
  expect(requests[2].submission_id).not.toBe(requests[0].submission_id);
  expect(requests[2].answers.email).toBe("another@example.com");
  const archived = await page.evaluate(
    (id) => sessionStorage.getItem(`cosmos-quote-attempt-archive-${id}`),
    requests[0].submission_id,
  );
  expect(JSON.parse(archived!)).toEqual(requests[0]);
});

for (const scenario of [
  {
    status: 202,
    body: { ok: true, receipt_id: "bad", status: "received" },
    text: "couldn't confirm",
  },
  {
    status: 429,
    body: { ok: false, code: "rate_limited" },
    text: "Too many attempts",
  },
  {
    status: 413,
    body: { ok: false, code: "too_large" },
    text: "could not be accepted",
  },
  {
    status: 422,
    body: { ok: false, code: "invalid" },
    text: "could not be accepted",
  },
  {
    status: 503,
    body: { ok: false, code: "unavailable" },
    text: "couldn't confirm",
  },
])
  test(`HTTP ${scenario.status} retains draft/attempt without success`, async ({
    page,
  }) => {
    await page.route("**/api/quote", (route) =>
      route.fulfill({ status: scenario.status, json: scenario.body }),
    );
    await review(page);
    await send(page);
    await expect(page.locator(".quote-card").getByRole("alert")).toContainText(
      scenario.text,
    );
    expect(
      await page.evaluate(
        () =>
          !!sessionStorage.getItem("cosmos-quote-attempt") &&
          !!sessionStorage.getItem("cosmos-quote-draft"),
      ),
    ).toBe(true);
    await expect(
      page.getByRole("heading", { name: "Thank you. Your request is in." }),
    ).toHaveCount(0);
  });

test("phone is required before submission", async ({ page }) => {
  await review(page);
  await page
    .getByRole("button", { name: "Change contact", exact: true })
    .click();
  await page.getByLabel("Phone", { exact: true }).fill("");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator(".field-error")).toHaveText(
    "Enter your phone number.",
  );
  await expect(page.getByLabel("Phone", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

test("failure to retain an attempt blocks transport with an explanation", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/quote", (route) => {
    requests++;
    return route.abort();
  });
  await review(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "cosmos-quote-attempt") throw new Error("storage blocked");
      original.call(this, key, value);
    };
  });
  await send(page);
  await expect(page.locator(".quote-card").getByRole("alert")).toContainText(
    "could not retain this submission",
  );
  expect(requests).toBe(0);
  await expect(page.locator(".quote-review")).toContainText(homeQuote.email);
});

test("a damaged stored attempt never silently becomes a new request", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "cosmos-quote-attempt",
      '{"submission_id":"broken"}',
    ),
  );
  await review(page);
  await expect(
    page.getByText(/saved submission could not be recovered safely/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send my request", exact: true }),
  ).toBeDisabled();
});
