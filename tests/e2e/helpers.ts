import { expect, type Page } from "@playwright/test";

/** Wait for smooth scrolling to come to rest, then return the position. */
export async function settledScroll(page: Page) {
  let last = -1;
  await expect
    .poll(
      async () => {
        const y = await page.evaluate(() => Math.round(window.scrollY));
        const still = y === last;
        last = y;
        return still;
      },
      { intervals: [250], timeout: 8_000 },
    )
    .toBe(true);
  return last;
}

/** Top of an element relative to the viewport. */
export const topOf = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => el.getBoundingClientRect().top);

export const opacityOf = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => Number(getComputedStyle(el).opacity));

/** Scroll with the mouse wheel in steps, as a person would. */
export async function wheel(page: Page, dy: number, steps = 6) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dy / steps);
    await page.waitForTimeout(40);
  }
}
