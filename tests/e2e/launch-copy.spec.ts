import { expect, test } from "@playwright/test";
import { siteConfig } from "../../src/lib/site";

/** What the launch version must say, and must no longer say. */
const PAGES = ["/", "/services", "/contact", "/clean-with-cosmos"];
const REMOVED =
  /background.check|\brating\b|testimonial|real review|review count|business day|how long a review|no account|account to create/i;

for (const path of PAGES)
  test(`${path} makes no unverified claims`, async ({ page }) => {
    await page.goto(path);
    expect(await page.locator("body").textContent()).not.toMatch(REMOVED);
  });

test("the contact page and footer give real ways to reach us", async ({
  page,
}) => {
  const { phones, email } = siteConfig.contact;
  await page.goto("/contact");
  const main = page.locator("main");
  const footer = page.locator("footer");
  for (const place of [main, footer]) {
    for (const phone of phones)
      await expect(
        place.getByRole("link", { name: phone.label }),
      ).toHaveAttribute("href", phone.href);
    await expect(place.getByRole("link", { name: email })).toHaveAttribute(
      "href",
      `mailto:${email}`,
    );
  }
  await expect(main.getByText("Hours", { exact: true })).toHaveCount(0);
  await expect(main.getByText("[PLACEHOLDER")).toHaveCount(0);
  await expect(footer.getByText("[PLACEHOLDER")).toHaveCount(0);
});
