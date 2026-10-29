import { expect, test } from "@playwright/test";
import { opacityOf, settledScroll } from "./helpers";

test.use({ reducedMotion: "reduce" });

test("reduced motion shows every scene still and finished", async ({
  page,
}) => {
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-motion", "off");
  // No smooth scrolling, even briefly during hydration.
  await page.waitForTimeout(500);
  await expect(html).not.toHaveClass(/lenis/);

  const viewport = page.viewportSize()!;
  for (const scene of [".hero", ".band", ".evening"]) {
    const height = await page
      .locator(scene)
      .evaluate((el) => el.getBoundingClientRect().height);
    expect(Math.round(height), scene).toBe(viewport.height);
  }

  // Scrolling past the hero leaves it untouched.
  await page.evaluate(() => window.scrollTo(0, 600));
  await settledScroll(page);
  expect(await opacityOf(page, "#hero-copy")).toBe(1);
  expect(
    await page
      .locator("#hero-media img")
      .evaluate((el) => getComputedStyle(el).transform),
  ).toBe("none");

  // Workplaces and evening show their words and finished photos.
  expect(await opacityOf(page, "#band-copy")).toBe(1);
  expect(
    await page
      .locator("#band-media")
      .evaluate((el) => getComputedStyle(el).clipPath),
  ).toBe("none");
  expect(await opacityOf(page, "#eve-copy")).toBe(1);
  expect(await opacityOf(page, "#eve-late")).toBe(1);

  // The checklist is already ticked.
  await page.locator("#checklist").scrollIntoViewIfNeeded();
  const offsets = await page
    .locator("#checklist .tick path")
    .evaluateAll((paths) =>
      paths.map((p) => getComputedStyle(p).strokeDashoffset),
    );
  expect(new Set(offsets)).toEqual(new Set(["0px"]));
});

test("reduced motion: section links jump straight there", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Pricing" })
    .click();
  const top = await page
    .locator("#pricing")
    .evaluate((el) => el.getBoundingClientRect().top);
  expect(Math.abs(top)).toBeLessThan(2);
});
