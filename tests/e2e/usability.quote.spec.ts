import { expect, test, type Page } from "@playwright/test";
import { homeQuote, officeQuote } from "../unit/fixtures";

async function restore(page: Page, answers: unknown, step: string) {
  await page.addInitScript(
    (draft) => {
      if (!sessionStorage.getItem("cosmos-quote-draft"))
        sessionStorage.setItem("cosmos-quote-draft", JSON.stringify(draft));
    },
    { answers, step },
  );
  await page.goto("/quote");
  await expect(page.locator(".quote-step")).toBeVisible();
}
const next = (page: Page) =>
  page.getByRole("button", { name: "Continue", exact: true }).click();

test("contact keyboard navigation and validation keep answers and focus", async ({
  page,
}) => {
  await restore(page, { ...homeQuote, email: "alex@" }, "contact");
  await page.getByLabel("Name", { exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Phone")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".field-error")).toBeFocused();
  await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.getByLabel("Email", { exact: true }).fill("alex@example.com");
  await page
    .getByRole("button", { name: "Continue", exact: true })
    .press("Enter");
  await expect(
    page.getByRole("heading", { name: "Check your answers" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Where should we send your quote?" }),
  ).toBeFocused();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
    "alex@example.com",
  );
});

test("rapid Continue clicks cannot skip review or submit a request", async ({
  page,
}) => {
  let submitted = false;
  await page.route("**/api/quote", (route) => {
    submitted = true;
    return route.abort();
  });
  await restore(page, homeQuote, "contact");
  await page
    .getByRole("button", { name: "Continue", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect(
    page.getByRole("heading", { name: "Check your answers" }),
  ).toBeFocused();
  expect(submitted).toBe(false);
});

test.describe("preferred start date", () => {
  test.use({ timezoneId: "America/Chicago" });
  test("native date control uses local days, validates and preserves its selection", async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date("2026-10-30T01:00:00Z")); // still Oct 29 in Texas
    await restore(page, { ...homeQuote, timing: "date", date: "" }, "timing");
    const date = page.getByLabel("Preferred start date", { exact: true });
    await expect(date).toHaveAttribute("type", "date");
    await expect(date).toHaveAttribute("min", "2026-10-29");
    await next(page);
    await expect(date).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator(".field-error")).toBeFocused();
    await page
      .getByRole("button", { name: "Tomorrow", exact: true })
      .press("Enter");
    await expect(date).toHaveValue("2026-10-30");
    await expect(
      page.getByRole("button", { name: "Tomorrow", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("button", { name: "In one week", exact: true })
      .click();
    await expect(date).toHaveValue("2026-11-05");
    await date.fill("2026-10-28");
    await next(page);
    await expect(page.locator(".field-error")).toHaveText(
      "Choose today or a later date.",
    );
    await date.fill("2026-11-05");
    await next(page);
    await expect(
      page.getByRole("heading", { name: "Anything we should know?" }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(date).toHaveValue("2026-11-05");
    await page.reload();
    await expect(date).toHaveValue("2026-11-05");
  });
});

test("older drafts with stale extras recover without trapping the visitor", async ({
  page,
}) => {
  await restore(
    page,
    { ...officeQuote, extras: ["pets", "after-hours"] },
    "details",
  );
  await expect(
    page.getByRole("checkbox", { name: "After-hours access" }),
  ).toBeChecked();
  await next(page);
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
    officeQuote.email,
  );
});

test("blocked session storage is explained while in-memory answers remain usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", {
      value: {
        getItem() {
          throw new Error("storage blocked");
        },
        setItem() {
          throw new Error("storage blocked");
        },
        removeItem() {
          throw new Error("storage blocked");
        },
      },
    });
  });
  await page.goto("/quote");
  await expect(page.getByRole("status")).toContainText("can't save this draft");
  await page.getByRole("radio", { name: /^Deep clean/ }).check();
  await next(page);
  await expect(
    page.getByRole("heading", { name: "What kind of property?" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("radio", { name: /^Deep clean/ })).toBeChecked();
});

test("short and narrow viewports keep fields and actions reachable without overlap", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await restore(page, homeQuote, "contact");
  await page.getByLabel("Email", { exact: true }).focus();
  // A viewport-resize approximation, not a real OS keyboard test.
  await page.setViewportSize({ width: 320, height: 320 });
  await page.getByLabel("Email", { exact: true }).fill("updated@example.com");
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    /interactive-widget=resizes-content/,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .getByLabel("Email", { exact: true })
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  const controls = page.locator(".quote-actions");
  await controls.scrollIntoViewIfNeeded();
  await expect(controls).toBeInViewport();
  expect(await controls.evaluate((el) => getComputedStyle(el).position)).toBe(
    "static",
  );
  await next(page);
  await expect(page.locator(".quote-review")).toContainText(
    "updated@example.com",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Change timing" }).click();
  await page
    .getByRole("radio", { name: "On a specific date", exact: true })
    .check();
  await page.waitForTimeout(250); // Let the radio selection feedback settle for visual review.
  await page.screenshot({
    path: testInfo.outputPath("preferred-date.png"),
    fullPage: true,
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("question changes take focus with no sliding or animated progress", async ({
    page,
  }) => {
    await restore(page, homeQuote, "contact");
    await next(page);
    await expect(
      page.getByRole("heading", { name: "Check your answers" }),
    ).toBeFocused();
    expect(
      await page
        .locator(".quote-progress span")
        .evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration)),
    ).toBeLessThanOrEqual(0.00001);
    expect(
      await page
        .locator(".quote-step")
        .evaluate((el) => getComputedStyle(el).transform),
    ).toBe("none");
  });
});
