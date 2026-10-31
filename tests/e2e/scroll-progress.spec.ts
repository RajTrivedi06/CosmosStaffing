import { devices, expect, test, type Page } from "@playwright/test";

/**
 * Every pinned scene should answer small scrolls with visible change, from
 * its first pixels to its last: no delayed start, no dead zone, no pause.
 * Each scene's state is read as a signature of the properties it animates.
 */
const SCENES = {
  hero: `[
    getComputedStyle(document.querySelector("#hero-media")).clipPath,
    getComputedStyle(document.querySelector("#hero-media img")).transform,
  ]`,
  band: `[
    getComputedStyle(document.querySelector("#band-media")).clipPath,
    getComputedStyle(document.querySelector("#band-media img")).transform,
  ]`,
  evening: `[
    getComputedStyle(document.querySelector(".evening .stage img")).transform,
    getComputedStyle(document.querySelector("#eve-late")).opacity,
  ]`,
} as const;
const SELECTORS = { hero: ".hero", band: ".band", evening: ".evening" };

async function signature(page: Page, scene: keyof typeof SCENES) {
  return page.evaluate((expr) => JSON.stringify(eval(expr)), SCENES[scene]);
}

/** Scroll to a scene's start plus `px`, then let ScrollTrigger catch up. */
async function scrollInto(page: Page, scene: keyof typeof SCENES, px: number) {
  await page.evaluate(
    ([sel, offset]) => {
      const el = document.querySelector<HTMLElement>(sel)!;
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, Math.round(top + offset));
    },
    [SELECTORS[scene], px] as const,
  );
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 50))),
  );
}

async function expectResponsive(page: Page) {
  await page.goto("/");
  await page.waitForTimeout(1600); // the hero's entrance
  for (const scene of Object.keys(SCENES) as (keyof typeof SCENES)[]) {
    const range = await page.evaluate(
      (sel) =>
        document.querySelector<HTMLElement>(sel)!.offsetHeight -
        window.innerHeight,
      SELECTORS[scene],
    );
    // A small, deliberate scroll at the very start already shows.
    await scrollInto(page, scene, 0);
    const start = await signature(page, scene);
    await scrollInto(page, scene, 24);
    expect(await signature(page, scene), `${scene} +24px`).not.toBe(start);

    // And it keeps moving all the way through.
    let previous = await signature(page, scene);
    const step = range / 20;
    for (let i = 1; i <= 20; i++) {
      await scrollInto(page, scene, 24 + Math.min(range - 24, step * i));
      const now = await signature(page, scene);
      expect(now, `${scene} step ${i} of 20`).not.toBe(previous);
      previous = now;
    }
  }
}

test("small scrolls move every scene, start to finish", async ({ page }) => {
  await expectResponsive(page);
});

test.describe("on a phone", () => {
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } =
    devices["Pixel 7"];
  test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });

  test("small scrolls move every scene, start to finish", async ({ page }) => {
    await expectResponsive(page);
  });

  test("the evening pans from the door to the sofa without a jump", async ({
    page,
  }) => {
    await page.goto("/");
    const x = async () =>
      page.evaluate(
        () =>
          new DOMMatrix(
            getComputedStyle(document.querySelector(".evening .stage img")!)
              .transform,
          ).m41,
      );
    const positions: number[] = [];
    const range = await page.evaluate(
      () =>
        document.querySelector<HTMLElement>(".evening")!.offsetHeight -
        window.innerHeight,
    );
    for (let i = 0; i <= 20; i++) {
      await scrollInto(page, "evening", (range * i) / 20);
      positions.push(await x());
    }
    // The photo slides right (the view travels left, to the sofa) on every
    // step, in even increments.
    const steps = positions.slice(1).map((p, i) => p - positions[i]);
    for (const d of steps) expect(d).toBeGreaterThan(0);
    const largest = Math.max(...steps.map(Math.abs));
    const smallest = Math.min(...steps.map(Math.abs));
    expect(largest / smallest).toBeLessThan(1.5);
  });
});

test("the hero never shows two of its texts at once", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(1600);
  const range = await page.evaluate(
    () =>
      document.querySelector<HTMLElement>(".hero")!.offsetHeight - innerHeight,
  );
  for (let i = 0; i <= 80; i++) {
    await page.evaluate(
      (y) => window.scrollTo(0, y),
      Math.round((range * i) / 80),
    );
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30))),
    );
    const shown = await page.evaluate(() =>
      ["#hero-copy", "#say-1", "#say-2"].filter(
        (s) =>
          Number(getComputedStyle(document.querySelector(s)!).opacity) > 0.02,
      ),
    );
    expect(shown.length, `step ${i}: ${shown.join(", ")}`).toBeLessThanOrEqual(
      1,
    );
  }
});
