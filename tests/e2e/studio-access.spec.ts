import { expect, test } from "@playwright/test";
import { STUDIO_PATHS } from "../../src/lib/studio-routes";

/**
 * A build run as a paired Vercel Preview, against the Studio stub. The stub
 * echoes the access header it received, so these show what reaches the Studio
 * and what comes back. Not hosted evidence: docs/protected-preview-access.md
 * lists what only a real Preview can prove.
 */
const PREVIEW = "http://localhost:3203";
const VALUE = "synthetic-only-protection-value";
const paths = STUDIO_PATHS.map((path) => path.replace(":path+", "synthetic"));

test("every forwarded path carries the access header on a Preview host", async ({
  request,
}) => {
  for (const path of paths) {
    const response = await request.get(`${PREVIEW}${path}`, {
      headers: { host: "cosmos-preview.vercel.app" },
    });
    const body = await response.text();
    expect(body, path).toContain(`<p id="access">${VALUE}</p>`);
    expect(JSON.stringify(response.headers()), path).not.toContain(VALUE);
  }
});

test("the company domain never runs it", async ({ request }) => {
  for (const path of paths) {
    const response = await request.get(`${PREVIEW}${path}`, {
      headers: { host: "www.cosmosservicesllc.com" },
    });
    expect(await response.text(), path).toContain('<p id="access"></p>');
  }
});

test("a visitor's own header isn't how the Studio is reached", async ({
  request,
}) => {
  const response = await request.get(`${PREVIEW}/me/login`, {
    headers: {
      host: "cosmos-preview.vercel.app",
      "x-vercel-protection-bypass": "from-a-visitor",
    },
  });
  expect(await response.text()).toContain(`<p id="access">${VALUE}</p>`);
});

test("forwarded Server Actions keep their method, body and headers", async ({
  request,
}) => {
  const response = await request.post(`${PREVIEW}/q/synthetic`, {
    headers: {
      host: "cosmos-preview.vercel.app",
      "next-action": "synthetic-action",
      cookie: "cosmos-client-auth=synthetic",
    },
    data: "field=value",
  });
  const body = await response.text();
  expect(body).toContain('<p id="method">POST</p>');
  expect(body).toContain('<p id="body">field=value</p>');
  expect(body).toContain('<p id="action">synthetic-action</p>');
  expect(body).toContain("cosmos-client-auth=synthetic");
  expect(body).toContain(`<p id="access">${VALUE}</p>`);
});

test("the site's own pages don't send or show it", async ({ request }) => {
  const response = await request.get(`${PREVIEW}/`, {
    headers: { host: "cosmos-preview.vercel.app" },
  });
  expect(await response.text()).not.toContain(VALUE);
});
