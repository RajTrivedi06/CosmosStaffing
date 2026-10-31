import { expect, test } from "@playwright/test";
import { cleaners, contactPage } from "../../src/lib/site";

test("contact offers two separate ways in", async ({ page }) => {
  await page.goto("/contact");
  const actions = page.getByRole("region", {
    name: contactPage.actions.title,
  });
  await expect(
    actions.getByRole("link", { name: contactPage.actions.clients.label }),
  ).toHaveAttribute("href", "/quote");
  const apply = actions.getByRole("link", { name: cleaners.apply.label });
  await expect(apply).toHaveAttribute("href", `${cleaners.path}#apply`);

  // While the application is closed, Apply explains that instead of failing.
  await apply.click();
  await expect(page).toHaveURL(new RegExp(`${cleaners.path}#apply$`));
  const state = page.locator("#apply");
  await expect(state).toContainText(cleaners.apply.label);
  await expect(state).toContainText(cleaners.apply.pending);
  await expect(state).toBeInViewport();
});

test("the recruitment page collects nothing", async ({ page }) => {
  for (const path of [cleaners.path, "/contact"]) {
    await page.goto(path);
    await expect(
      page.locator("form, input, textarea, select, [contenteditable]"),
      path,
    ).toHaveCount(0);
  }
});

test("insurance and payout terms stay off the page until confirmed", async ({
  page,
}) => {
  await page.goto(cleaners.path);
  await expect(page.locator("main")).not.toContainText(
    /insur|pay rate|payout|still to confirm|\[PLACEHOLDER/i,
  );
  await expect(page.getByText(/get hired/i)).toHaveCount(0);
});

test("SMS sign-in stays off the site until the hosted flow is verified", async ({
  page,
}) => {
  test.skip(cleaners.signIn.available, "published");
  for (const path of ["/", cleaners.path, "/contact"]) {
    await page.goto(path);
    await expect(page.locator('a[href="/me/login"]'), path).toHaveCount(0);
    expect(await page.locator("body").textContent(), path).not.toMatch(
      /texted code|text message|\bSMS\b|verify your phone/i,
    );
  }
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Menu" })
      .getByRole("link", { name: cleaners.signIn.label }),
  ).toHaveCount(0);
});

test("cleaner sign-in works from the phone menu", async ({ page }) => {
  test.skip(!cleaners.signIn.available, "waits for hosted SMS verification");
  await page.goto("/");
  await page.getByRole("button", { name: "Menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu.getByRole("link", { name: cleaners.label })).toBeVisible();
  await menu.getByRole("link", { name: cleaners.signIn.label }).click();
  // Forwarded to the (stubbed) Studio, with the company domain kept.
  await expect(page).toHaveURL(/\/me\/login$/);
  await expect(page.locator("#path")).toHaveText("/me/login");
});

test("the menu reaches the recruitment page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Menu" }).click();
  await page
    .getByRole("dialog", { name: "Menu" })
    .getByRole("link", { name: cleaners.label })
    .click();
  await expect(page).toHaveURL(new RegExp(`${cleaners.path}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: cleaners.title }),
  ).toBeVisible();
});
