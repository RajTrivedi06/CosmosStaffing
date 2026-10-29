import { expect, test } from "@playwright/test";
import { opacityOf, settledScroll, topOf, wheel } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
});

test("section links land with the section flush at the top", async ({
  page,
}) => {
  const nav = page.getByRole("navigation", { name: "Main" });
  for (const [label, id] of [
    ["How it works", "#how"],
    ["Pricing", "#pricing"],
    ["Questions", "#faq"],
  ]) {
    await nav.getByRole("link", { name: label }).click();
    await settledScroll(page);
    expect(Math.abs(await topOf(page, id)), label).toBeLessThan(2);
    await expect(page).toHaveURL(new RegExp(`${id}$`));
    // The bar collapses on the way down; bring it back for the next link.
    await page.evaluate(() => window.scrollTo(0, 0));
    await settledScroll(page);
  }
});

test("the Workplaces link opens on the finished scene", async ({ page }) => {
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Workplaces" })
    .click();
  await settledScroll(page);
  expect(await opacityOf(page, "#band-copy")).toBeGreaterThan(0.95);
  await expect(
    page.getByRole("link", { name: "Get a workplace quote" }),
  ).toBeInViewport();
});

test("the navbar collapses on the way down and opens on the way up", async ({
  page,
}) => {
  const header = page.locator("header.nav");
  const cta = header.getByRole("link", { name: "Get my price" });
  const links = page.locator(".nav-collapse");

  await expect(header).not.toHaveAttribute("data-compact");
  await wheel(page, 1200);
  await expect(header).toHaveAttribute("data-compact");
  await expect(links).toHaveAttribute("inert", "");
  await expect(cta).toBeVisible();

  await wheel(page, -400);
  await expect(header).not.toHaveAttribute("data-compact");
  await expect(links).not.toHaveAttribute("inert");
  await expect(cta).toBeVisible();
  await cta.click();
  await expect(page).toHaveURL(/\/quote$/);
});

test("faded scene copy stays readable by screen readers", async ({ page }) => {
  await page.evaluate(() => window.scrollTo(0, 3000));
  await settledScroll(page);
  // Faded with opacity only, so the h1 stays in the accessibility tree.
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  expect(
    await page
      .locator("#hero-copy")
      .evaluate((el) => getComputedStyle(el).visibility),
  ).toBe("visible");
  // ...but its buttons stop taking clicks while faded.
  expect(
    await page
      .locator("#hero-copy")
      .evaluate((el) => getComputedStyle(el).pointerEvents),
  ).toBe("none");
});

test("tabbing into a faded scene scrolls it into view", async ({ page }) => {
  // Focus the last link before the workplaces scene, then tab forward.
  await page.getByRole("link", { name: "All services" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Get a workplace quote" }),
  ).toBeFocused();
  await settledScroll(page);
  expect(await opacityOf(page, "#band-copy")).toBeGreaterThan(0.95);
});

test("scroll scenes re-measure when answers open", async ({ page }) => {
  // Open every answer, which pushes the closing section down the page.
  await page.locator("#faq").scrollIntoViewIfNeeded();
  for (const summary of await page.locator("#faq summary").all()) {
    await summary.click();
  }
  await page.waitForTimeout(500);

  // Park with the close below the 55% line where its time takes over. A
  // trigger measured before the answers opened would already have fired.
  await page.evaluate(() => {
    const close = document.querySelector(".close-cta")!;
    const top = close.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top - window.innerHeight * 0.8);
  });
  await settledScroll(page);
  await expect(page.locator("#clock")).toHaveText("20:00", { timeout: 4000 });
});
