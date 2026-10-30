import { expect, test, type APIResponse } from "@playwright/test";

// The test build forwards to tests/e2e/studio-stub.mjs, which echoes the
// method, path and body it received.
const fromStudio = async (res: APIResponse) => {
  const html = await res.text();
  if (!html.includes("Studio stub")) return null;
  const field = (id: string) =>
    html.match(new RegExp(`<p id="${id}">([^<]*)</p>`))?.[1] ?? "";
  return { method: field("method"), path: field("path"), body: field("body") };
};

const FORWARDED = [
  "/me",
  "/me/login",
  "/me/login?join=synthetic-token",
  "/me/sign/agreement",
  "/terms",
  "/join/00000000-0000-4000-8000-000000000000",
  "/pay/00000000-0000-4000-8000-000000000000",
  "/q/00000000-0000-4000-8000-000000000000",
  "/o/00000000-0000-4000-8000-000000000000",
  "/studio-assets/_next/static/chunks/app.js",
];

test("Studio recipient paths are forwarded with their query", async ({
  request,
}) => {
  for (const path of FORWARDED) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).toBe(200);
    expect(await fromStudio(res), path).toMatchObject({
      method: "GET",
      path,
    });
  }
});

test("form posts reach the Studio unchanged", async ({ request }) => {
  const res = await request.post("/join/00000000-0000-4000-8000-000000000000", {
    form: { step: "name", value: "Test Cleaner" },
  });
  expect(await fromStudio(res)).toMatchObject({
    method: "POST",
    body: "step=name&amp;value=Test+Cleaner",
  });
});

test("staff login, the API, /apply and bare prefixes stay on this site", async ({
  request,
}) => {
  for (const path of [
    "/login",
    "/jobs",
    "/money",
    "/api/integrations/thumbtack",
    "/_next/static/studio-only.js",
    "/apply",
    "/join",
    "/pay",
    "/q",
    "/o",
    "/studio-assets/logo.png",
  ]) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(await fromStudio(res), path).toBeNull();
    expect(res.status(), path).not.toBe(200);
  }
});

test("the website's own pages never link to /apply while it is closed", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/contact",
    "/clean-with-cosmos",
    "/services",
    "/quote",
  ]) {
    await page.goto(path);
    await expect(page.locator('a[href="/apply"]'), path).toHaveCount(0);
    await expect(
      page.locator('a[href*="/login"]:not([href="/me/login"])'),
      path,
    ).toHaveCount(0);
    await expect(
      page.locator('a[href*="studio.cosmosservicesllc.com"]'),
      path,
    ).toHaveCount(0);
  }
});

test("forwarding preserves action headers, host-only cookies and upstream protections", async ({
  request,
  baseURL,
}) => {
  const res = await request.post("/join/synthetic-token?step=contact", {
    headers: {
      Cookie: "synthetic-session=incoming",
      "Next-Action": "synthetic-action",
      RSC: "1",
      Origin: baseURL!,
      "Content-Type": "text/plain",
    },
    data: "synthetic-body",
  });
  const html = await res.text();
  expect(html).toContain('<p id="cookie">synthetic-session=incoming</p>');
  expect(html).toContain('<p id="action">synthetic-action</p>');
  expect(html).toContain('<p id="rsc">1</p>');
  expect(html).toContain(`<p id="origin">${baseURL}</p>`);
  expect(await fromStudio(res)).toMatchObject({
    method: "POST",
    path: "/join/synthetic-token?step=contact",
    body: "synthetic-body",
  });
  expect(res.headers()).toMatchObject({
    "cache-control": "no-store, max-age=0",
    "x-robots-tag": "noindex, nofollow, noarchive",
    "referrer-policy": "no-referrer",
    "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
    "x-frame-options": "DENY",
    "x-content-type-options": "nosniff",
  });
  expect(res.headers()["set-cookie"]).toContain("synthetic-session=test");
  expect(res.headers()["set-cookie"]).not.toMatch(/domain=/i);
});

test("recipient redirects stay on the website origin", async ({
  request,
  page,
  baseURL,
}) => {
  const response = await request.get("/me?test-redirect=1", {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(303);
  expect(response.headers().location).toBe("/me/login");
  await page.goto("/me?test-redirect=1");
  expect(page.url()).toBe(`${baseURL}/me/login`);
});
