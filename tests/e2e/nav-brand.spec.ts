import { expect, test, type Page } from "@playwright/test";

const backing = (page: Page) =>
  page.evaluate(
    () =>
      getComputedStyle(document.querySelector(".brand")!, "::before").opacity,
  );
const button = (page: Page) =>
  page.locator(".nav-cta").evaluate((element) => {
    const { x, y, width, height } = element.getBoundingClientRect();
    return { x, y, width, height };
  });

test("scrolling down leaves only the button, which doesn't move", async ({
  page,
}) => {
  await page.goto("/");
  const header = page.locator("header.nav");
  const brand = page.locator(".brand");
  const place = await button(page);
  const brandPlace = await brand.boundingBox();
  await expect(brand).toBeVisible();

  await page.mouse.wheel(0, 1600);
  await expect(header).toHaveAttribute("data-compact");
  await expect(brand).toBeHidden();
  await expect(page.locator(".nav-links")).toHaveCSS("opacity", "0");
  await expect(page.locator(".nav-cta")).toBeVisible();
  await page.waitForTimeout(600);
  expect(await button(page)).toEqual(place);

  // Back up: the full bar returns, with the wordmark on its glass backing.
  await page.mouse.wheel(0, -300);
  await expect(header).not.toHaveAttribute("data-compact");
  await expect(brand).toBeVisible();
  await expect.poll(() => backing(page)).toBe("1");
  await page.waitForTimeout(600);
  expect(await button(page)).toEqual(place);
  expect(await brand.boundingBox()).toEqual(brandPlace);

  // At the top of the page the wordmark sits on the page itself.
  await page.mouse.wheel(0, -4000);
  await expect.poll(() => backing(page)).toBe("0");
});

test("keyboard focus brings the full bar back", async ({ page }) => {
  await page.goto("/");
  const header = page.locator("header.nav");
  await page.mouse.wheel(0, 1600);
  await expect(header).toHaveAttribute("data-compact");
  // The wordmark is out of the tab order while hidden, so this reaches the
  // button, and focus inside the bar opens it.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(header).not.toHaveAttribute("data-compact");
  await expect(page.locator(".brand")).toBeVisible();
});
