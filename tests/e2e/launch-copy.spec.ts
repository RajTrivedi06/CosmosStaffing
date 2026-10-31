import { expect, test } from "@playwright/test";
import { siteConfig } from "../../src/lib/site";

/** What the launch version must say, and must no longer say. */
const PAGES = ["/", "/services", "/contact", "/clean-with-cosmos"];
const REMOVED =
  /background.check|\brating\b|testimonial|real review|review count|business day|how long a review|no account|account to create|\[PLACEHOLDER|insur|come back free|same small team|same team|same people|your team every|runs itself|one invoice|one contact|one point of contact|do you bring supplies|re-clean|put it right|pause or cancel|fairly paid|pay rates|payout|still to confirm|full terms/i;

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
