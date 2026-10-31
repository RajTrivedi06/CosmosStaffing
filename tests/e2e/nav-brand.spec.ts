import { expect, test } from "@playwright/test";

const backing = (page: import("@playwright/test").Page) =>
  page.evaluate(
    () =>
      getComputedStyle(document.querySelector(".brand")!, "::before").opacity,
  );

test("the wordmark gets its backing once the page scrolls, without moving", async ({
  page,
}) => {
  await page.goto("/");
  const brand = page.locator(".brand");
  const before = await brand.boundingBox();
  expect(await backing(page)).toBe("0");

  await page.mouse.wheel(0, 1600);
  await expect.poll(() => backing(page)).toBe("1");
  expect(await brand.boundingBox()).toEqual(before);

  // Still there while the links reopen on the way back up, until the top.
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(600);
  expect(await backing(page)).toBe("1");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => backing(page)).toBe("0");
});
