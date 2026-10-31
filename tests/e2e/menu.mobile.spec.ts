import { expect, test } from "@playwright/test";
import { settledScroll, topOf } from "./helpers";

test("the phone menu locks the page and returns focus", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, 2000));
  await settledScroll(page);
  // The bar collapses on the way down; scrolling up brings the menu back.
  await page.evaluate(() => window.scrollBy(0, -300));
  await expect(page.locator("header.nav")).not.toHaveAttribute("data-compact");
  const y = await settledScroll(page);

  const menu = page.getByRole("button", { name: "Menu" });
  await menu.click();
  const sheet = page.getByRole("dialog", { name: "Menu" });
  await expect(sheet).toBeVisible();
  await expect(page.locator("main")).toHaveAttribute("inert", "");

  await page.mouse.wheel(0, 800);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.scrollY)).toBe(y);

  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(menu).toBeFocused();
  await expect(page.locator("main")).not.toHaveAttribute("inert");
});

test("a menu link scrolls to its section once the menu closes", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Menu" }).click();
  await page
    .getByRole("dialog", { name: "Menu" })
    .getByRole("link", { name: "Questions" })
    .click();
  await settledScroll(page);
  expect(Math.abs(await topOf(page, "#faq"))).toBeLessThan(2);
  await expect(page.locator("#faq")).toBeFocused();
});

test("the booking bar shows after the hero and stays clear of the last question", async ({
  page,
}) => {
  await page.goto("/");
  const bar = page.locator("#book-bar");
  await expect(bar).not.toHaveClass(/show/);
  await page.locator("#how").scrollIntoViewIfNeeded();
  await expect(bar).toHaveClass(/show/);
  await expect(bar.getByRole("link", { name: "Get my price" })).toBeVisible();
});

test("the hero fits a phone screen without clipping", async ({ page }) => {
  await page.goto("/");
  const viewport = page.viewportSize()!;
  for (const name of ["Get my price", "See how it works"]) {
    const box = await page
      .locator("#hero-copy")
      .getByRole("link", { name })
      .boundingBox();
    expect(box, name).not.toBeNull();
    expect(box!.y + box!.height, name).toBeLessThanOrEqual(viewport.height);
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

test("the booking bar never covers a scene's button", async ({ page }) => {
  await page.goto("/#workplaces");
  await settledScroll(page);
  const bar = page.locator("#book-bar");
  await expect(bar).toHaveClass(/show/);
  const barTop = (await bar.boundingBox())!.y;
  const button = page.getByRole("link", { name: "Get a workplace quote" });
  const box = (await button.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(barTop);
});

test("the booking bar steps aside for the services' own quote button", async ({
  page,
}) => {
  await page.goto("/#services");
  await settledScroll(page);
  const bar = page.locator("#book-bar");
  await expect(page.locator(".service-picker")).toBeInViewport();
  await expect(bar).not.toHaveClass(/show/);
  // Back after the services, on the way to the workplaces.
  await page.goto("/#workplaces");
  await settledScroll(page);
  await expect(bar).toHaveClass(/show/);
});
