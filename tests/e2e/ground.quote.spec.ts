import { expect, test } from "@playwright/test";

/**
 * Phones paint the area around the page (the status bar in Safari, overscroll,
 * the home indicator) from the theme colour and the root background. On the
 * focused pages both are the warm ground, and the page's own top edge starts
 * at that same colour, so no band or seam shows where they meet.
 */
for (const path of ["/quote", "/account/login"])
  test(`${path} meets the phone's edges in one colour`, async ({ page }) => {
    await page.goto(path);
    const theme = await page
      .locator('meta[name="theme-color"]')
      .getAttribute("content");
    expect(theme).toBe("#f4efe7");
    const ground = await page.evaluate(() => {
      const shell = document.querySelector(".quote-shell")!;
      const layer = getComputedStyle(shell, "::before");
      return {
        root: getComputedStyle(document.documentElement).backgroundColor,
        body: getComputedStyle(document.body).backgroundColor,
        position: layer.position,
        image: layer.backgroundImage,
        shell: getComputedStyle(shell).backgroundImage,
      };
    });
    expect(ground.root).toBe("rgb(244, 239, 231)");
    expect(ground.body).toBe("rgba(0, 0, 0, 0)");
    // One fixed layer behind the page, starting flat in the theme colour.
    expect(ground.position).toBe("fixed");
    expect(ground.image).toMatch(/^linear-gradient\(rgb\(244, 239, 231\)/);
    expect(ground.shell).toBe("none");
  });
