import { expect, test } from "@playwright/test";

const PAGES = ["/", "/services", "/contact", "/terms", "/quote"];

test("every internal link resolves, and its target exists", async ({
  page,
  request,
}) => {
  const seen = new Set<string>();
  for (const path of PAGES) {
    await page.goto(path);
    const hrefs = await page
      .locator("a[href]")
      .evaluateAll((links) => links.map((a) => (a as HTMLAnchorElement).href));
    for (const href of hrefs) {
      const url = new URL(href);
      if (url.origin !== new URL(page.url()).origin) continue;
      const key = url.pathname + url.search + url.hash;
      if (seen.has(key)) continue;
      seen.add(key);

      const res = await request.get(url.pathname + url.search);
      expect(res.status(), key).toBe(200);
      if (url.hash) {
        const html = await res.text();
        expect(html, key).toContain(`id="${url.hash.slice(1)}"`);
      }
    }
  }
  expect(seen.size).toBeGreaterThan(15);
});

test("old staffing pages redirect", async ({ request }) => {
  for (const [from, to] of [
    ["/staffing", "/"],
    ["/jobs/123", "/"],
    ["/hr-payroll", "/"],
    ["/about", "/services"],
  ]) {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status(), from).toBe(308);
    expect(res.headers().location, from).toBe(to);
  }
});

test("search engines get robots.txt, a sitemap and page metadata", async ({
  page,
  request,
}) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /api/");
  expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);

  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const path of ["/services", "/quote", "/contact", "/terms"]) {
    expect(sitemap).toContain(`${path}</loc>`);
  }

  await page.goto("/services");
  await expect(page).toHaveTitle("Services | Cosmos Cleaning");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/services$/,
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /\/og\.jpg$/,
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Services | Cosmos Cleaning",
  );
});
