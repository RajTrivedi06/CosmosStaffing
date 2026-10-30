import { expect, type BrowserContext, type Page } from "@playwright/test";
import { homeQuote } from "../unit/fixtures";

/** The first questions, as a link: the screen opens at where and when. */
export const choicesLink = `/quote?${new URLSearchParams({
  service: homeQuote.service!,
  property: homeQuote.property!,
  bedrooms: homeQuote.bedrooms!,
  bathrooms: homeQuote.bathrooms!,
  frequency: homeQuote.frequency!,
  condition: homeQuote.condition!,
})}`;

const proceed = (page: Page) =>
  page.getByRole("button", { name: "Continue", exact: true }).click();

/** The questions a client answers after signing in, ending on the review. */
export async function finishQuestions(
  page: Page,
  { name, email }: { name: string; email: string },
) {
  await page.getByLabel("ZIP code").fill(homeQuote.zip!);
  await proceed(page);
  await page.getByRole("radio", { name: "Within two weeks" }).check();
  await proceed(page);
  await page.getByRole("checkbox", { name: "Pets at home" }).check();
  await page.getByLabel("Notes").fill(homeQuote.notes);
  await proceed(page);
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Phone").fill(homeQuote.phone);
  await proceed(page);
  await expect(
    page.getByRole("heading", { name: "Check your answers" }),
  ).toBeVisible();
}

/** Everything in this browser's storage, for what must not be there. */
export const storedText = (page: Page) =>
  page.evaluate(() =>
    JSON.stringify([{ ...localStorage }, { ...sessionStorage }]),
  );

/** The tokens in a context's session cookies, for checks against Auth. */
export async function sessionTokens(context: BrowserContext) {
  const joined = (await context.cookies())
    .filter((c) => /^cosmos-client-auth(\.\d+)?$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map((c) => c.value)
    .join("");
  return JSON.parse(
    Buffer.from(joined.replace(/^base64-/, ""), "base64url").toString(),
  ) as { access_token: string; refresh_token: string };
}
