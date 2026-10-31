import { expect, test } from "@playwright/test";
import { cleaners, services, siteConfig } from "../../src/lib/site";

/** What the launch version must say, and must no longer say. */
const PAGES = ["/", "/services", "/contact", "/clean-with-cosmos"];
const REMOVED =
  /background.check|\brating\b|testimonial|real review|review count|business day|how long a review|no account|account to create|\[PLACEHOLDER|insur|come back free|same small team|same team|same people|your team every|runs itself|one invoice|one contact|one point of contact|do you bring supplies|re-clean|put it right|pause or cancel|fairly paid|pay rates|payout|still to confirm|full terms|written standard|every visit|notes kept|restocked|never left to memory|spotless|walkthrough|before or after hours|working hours|first meeting|often, yes|zelle|cash app|venmo/i;

for (const path of PAGES)
  test(`${path} makes no unverified claims`, async ({ page }) => {
    await page.goto(path);
    expect(await page.locator("body").textContent()).not.toMatch(REMOVED);
  });

for (const path of PAGES)
  test(`${path} links to no unfinished terms`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('a[href="/terms"]')).toHaveCount(0);
  });

test("service concerns and scheduling use the confirmed wording", async ({
  page,
}) => {
  await page.goto("/services");
  const main = page.locator("main");
  await expect(main).toContainText("Contact Cosmos about a service concern.");
  await expect(main).toContainText("Our team coordinates scheduling with you.");
});

test("the quote confirms scope, location and schedule", async ({ page }) => {
  const confirms = "Cosmos confirms the scope, location and schedule";
  for (const path of ["/", "/services"]) {
    await page.goto(path);
    await expect(page.locator("main"), path).toContainText(confirms);
  }
});

test("regular cleaning frequencies read as requests", async ({ page }) => {
  await page.goto("/services");
  await expect(page.locator("main")).toContainText(
    "Request weekly, every-two-weeks or monthly cleaning",
  );
  expect(services[0].short).toContain("you can request weekly");
  await page.goto("/quote");
  await expect(page.locator("main")).toContainText(
    "Request weekly, every two weeks or monthly",
  );
});

test("recruitment describes the opportunity and agreement", async ({
  page,
}) => {
  await page.goto(cleaners.path);
  const main = page.locator("main");
  await expect(main).toContainText("opportunity for independent cleaners");
  await expect(main).toContainText("The Cleaner Agreement sets out");
  await expect(main).not.toContainText(/not an employee/i);
});

test("the contact page and footer publish the monitored email only", async ({
  page,
}) => {
  const { email } = siteConfig.contact;
  await page.goto("/contact");
  const main = page.locator("main");
  const footer = page.locator("footer");
  for (const place of [main, footer])
    await expect(place.getByRole("link", { name: email })).toHaveAttribute(
      "href",
      `mailto:${email}`,
    );
  await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
  await expect(main.getByText("Phone", { exact: true })).toHaveCount(0);
  await expect(main.getByText("Hours", { exact: true })).toHaveCount(0);
});
