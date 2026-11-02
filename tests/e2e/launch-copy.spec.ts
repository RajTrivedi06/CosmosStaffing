import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  cleaners,
  home,
  services,
  servicesPage,
  siteConfig,
} from "../../src/lib/site";

/** What the launch version must say, and must no longer say. */
const PAGES = ["/", "/services", "/contact", "/clean-with-cosmos"];
const REMOVED =
  /background.check|\brating\b|testimonial|real review|review count|business day|how long a review|no account|account to create|\[PLACEHOLDER|insur|come back free|same small team|same team|same people|your team every|runs itself|one invoice|one contact|one point of contact|do you bring supplies|re-clean|put it right|pause or cancel|fairly paid|pay rates|payout|still to confirm|full terms|written standard|every visit|notes kept|restocked|never left to memory|spotless|walkthrough|before or after hours|working hours|first meeting|often, yes|zelle|cash app|venmo|typically includes|throughout|top-to-bottom|inside every|everything in a|\\bhob\\b|skirting|splashback|limescale|cupboard|wardrobe|fridge|\\btap\\b|\\bbasin\\b|\\bbins\\b|agree the details|handover/i;

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

test("service lists read as examples, and requests need confirming", async ({
  page,
}) => {
  await page.goto("/services");
  const main = page.locator("main");
  for (const service of services) {
    const article = main.locator(`article#${service.id}`);
    await expect(article).toContainText(servicesPage.includesTitle);
    await expect(article).toContainText(servicesPage.confirm);
    for (const task of service.onRequest)
      await expect(article).toContainText(task);
    await expect(
      article.getByRole("link", { name: service.cta, exact: true }),
    ).toHaveAttribute("href", `/quote?service=${service.id}`);
  }
  for (const wording of ["Get a deep clean quote", "Get a workplace quote"])
    await expect(main.getByRole("link", { name: wording })).toBeVisible();
  for (const id of ["regular", "deep", "move"]) {
    const article = main.locator(`article#${id}`);
    await expect(article).toContainText(servicesPage.onRequestTitle);
    await expect(article).toContainText("Oven and refrigerator interiors");
    await expect(article).toContainText("Interior windows");
  }
  await expect(main.locator("article#move")).toContainText(
    "Items from your landlord's or property manager's move-out checklist",
  );
  // Tasks to request are listed only as requests.
  for (const service of services)
    expect(service.includes.join(" ")).not.toMatch(
      /refrigerator|interior windows|oven interior/i,
    );

  await page.goto("/");
  await expect(page.locator("#checklist")).toContainText(home.standard.confirm);
  await expect(page.locator("#checklist")).toContainText("Backsplash");
});

test("the quote questions use U.S. wording", () => {
  const source = readFileSync("src/lib/quote.ts", "utf8");
  expect(source).toContain("Inside the refrigerator");
  expect(source).not.toContain("Inside the fridge");
  expect(source).not.toContain("top-to-bottom");
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
