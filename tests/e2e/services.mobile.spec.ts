import { expect, test, type Page } from "@playwright/test";
import { home, services } from "../../src/lib/site";

const picker = (page: Page) => page.locator(".service-picker");
const group = (page: Page) =>
  page.getByRole("radiogroup", { name: home.services.choose });
const quote = (page: Page) =>
  picker(page).getByRole("link", { name: home.services.go });

async function expectSelection(page: Page, index: number) {
  const service = services[index];
  await expect(
    group(page).getByRole("radio", { checked: true }),
  ).toHaveAccessibleName(service.title);
  // The button keeps one label; only where it leads changes.
  await expect(quote(page)).toHaveText(home.services.go);
  await expect(quote(page)).toHaveAttribute(
    "href",
    `/quote?service=${service.id}`,
  );
}

/** Scroll the page to a point in the reel (0 = first card, 1 = last). */
async function scrollReel(page: Page, progress: number) {
  await page.evaluate((p) => {
    const el = document.querySelector<HTMLElement>(".service-picker")!;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, Math.round(top + (el.offsetHeight - innerHeight) * p));
  }, progress);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("phones get the reel with one Get a quote button", async ({ page }) => {
  await expect(picker(page)).toBeVisible();
  await expect(page.locator("#services > .services")).toBeHidden();
  await expect(group(page).getByRole("radio")).toHaveCount(services.length);
  await expect(quote(page)).toHaveCount(1);
  await expectSelection(page, 0);
});

test("scrolling carries the services past one by one", async ({ page }) => {
  const last = services.length - 1;
  for (let i = 0; i <= last; i++) {
    await scrollReel(page, i / last);
    await expectSelection(page, i);
    // The card in place fills most of the screen width.
    const box = (await group(page).getByRole("radio").nth(i).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.width).toBeGreaterThan(page.viewportSize()!.width * 0.75);
  }
  // And back up again.
  await scrollReel(page, 0);
  await expectSelection(page, 0);
});

test("the reel stays pinned while it moves", async ({ page }) => {
  for (const p of [0.1, 0.5, 0.9]) {
    await scrollReel(page, p);
    await expect(picker(page).locator(".reel-stage")).toBeInViewport({
      ratio: 0.95,
    });
  }
});

test("tapping the next card scrolls to it without opening a quote", async ({
  page,
}) => {
  await scrollReel(page, 0);
  await group(page)
    .getByRole("radio", { name: services[1].title })
    .click({ position: { x: 10, y: 40 } });
  await expectSelection(page, 1);
  await expect(page).toHaveURL(/\/$/);
});

test("arrow keys move through the services", async ({ page }) => {
  await scrollReel(page, 0);
  await group(page).getByRole("radio").first().focus();
  await page.keyboard.press("ArrowRight");
  await expectSelection(page, 1);
  await page.keyboard.press("ArrowLeft");
  await expectSelection(page, 0);
  await expect(group(page).locator('[tabindex="0"]')).toHaveCount(1);
});

test("Get a quote fills in the service on screen", async ({ page }) => {
  await scrollReel(page, 1 / (services.length - 1));
  await expectSelection(page, 1);
  // Tap where the button sits, as a person would. (Playwright's click
  // scrolls first, even inside the pinned reel, which moves the reel on.)
  const box = (await quote(page).boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page).toHaveURL(/\/quote\?service=deep$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "What kind of property?" }),
  ).toBeVisible();
});

test("tablet and desktop keep the linked grid", async ({ page }) => {
  for (const width of [1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(picker(page)).toBeHidden();
    const grid = page.locator("#services > .services");
    await expect(grid).toBeVisible();
    await expect(grid.getByRole("link")).toHaveCount(services.length);
  }
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the row swipes natively and selection follows it", async ({ page }) => {
    await expect(picker(page)).toBeVisible();
    await group(page).evaluate((element) => {
      const cards = element.querySelectorAll<HTMLElement>("[role=radio]");
      element.scrollLeft = cards[2].offsetLeft - cards[0].offsetLeft;
    });
    await expectSelection(page, 2);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("every service keeps its own quote link", async ({ page }) => {
    await expect(picker(page)).toBeHidden();
    const grid = page.locator("#services > .services");
    await expect(grid).toBeVisible();
    for (const service of services) {
      await expect(
        grid.locator(`a[href="/quote?service=${service.id}"]`),
      ).toBeVisible();
    }
  });
});
