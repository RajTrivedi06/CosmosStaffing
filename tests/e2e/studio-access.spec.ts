import {
  createServer,
  get as httpGet,
  type IncomingMessage,
  type Server,
} from "node:http";
import { expect, test } from "@playwright/test";
import { STUDIO_PATHS } from "../../src/lib/studio-routes";

/**
 * This build run as a paired Vercel Preview, against the Studio stub, which
 * echoes the infrastructure headers that reached it. Not hosted evidence:
 * docs/protected-preview-access.md lists what only a real Preview can prove.
 */
const PLAIN = "http://localhost:3200";
const PREVIEW = "http://localhost:3203";
const DRIFTED = "http://localhost:3204";
const TOKENLESS = "http://localhost:3205";
const VALUE = "eyJhbGciOiJub25lIn0.eyJleHAiOjQxMDI0NDQ4MDB9.synthetic-only";
const paths = STUDIO_PATHS.map((path) => path.replace(":path+", "synthetic"));
const access = (value: string) => `<p id="access">${value}</p>`;
const FORGED = {
  "x-vercel-protection-bypass": "forged-by-a-visitor",
  "x-vercel-set-bypass-cookie": "true",
  "x-vercel-trusted-oidc-idp-token": "forged-by-a-visitor",
  "x-vercel-oidc-token": "forged-by-a-visitor",
};

/** A raw request, because Host has to arrive exactly as written. */
function rawGet(url: string, headers: Record<string, string>) {
  return new Promise<string>((resolve, reject) => {
    const req = httpGet(url, { headers }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve(body));
    });
    req.on("error", reject);
  });
}

/** A different host, standing in for wherever a redirect might point. */
let elsewhere: Server;
let elsewhereUrl: string;
const reached: IncomingMessage[] = [];

test.beforeAll(async () => {
  elsewhere = createServer((req, res) => {
    reached.push(req);
    res.end("elsewhere");
  });
  await new Promise<void>((done) => elsewhere.listen(0, "127.0.0.1", done));
  const { port } = elsewhere.address() as { port: number };
  elsewhereUrl = `http://127.0.0.1:${port}/landed`;
});
test.afterAll(() => {
  elsewhere.close();
});
test.beforeEach(() => {
  reached.length = 0;
});

test("every forwarded path carries the credential to the approved Studio", async ({
  request,
}) => {
  for (const path of paths) {
    const response = await request.get(`${PREVIEW}${path}`);
    expect(await response.text(), path).toContain(access(VALUE));
    expect(JSON.stringify(response.headers()), path).not.toContain(VALUE);
  }
});

test("a Preview that no longer matches its approval forwards nothing", async ({
  request,
}) => {
  for (const path of paths) {
    const response = await request.get(`${DRIFTED}${path}`);
    expect(response.status(), path).toBe(503);
    expect(await response.text(), path).not.toContain("Studio stub");
  }
});

test("a Preview with no token forwards nothing", async ({ request }) => {
  for (const path of paths) {
    const response = await request.get(`${TOKENLESS}${path}`);
    expect(response.status(), path).toBe(503);
    expect(await response.text(), path).not.toContain("Studio stub");
  }
});

test("outside a Preview the credential is never sent", async ({ request }) => {
  for (const path of paths) {
    const response = await request.get(`${PLAIN}${path}`);
    expect(await response.text(), path).toContain(access(""));
  }
});

test("a visitor's infrastructure credentials never reach the Studio", async () => {
  for (const [origin, expected] of [
    [PLAIN, ""],
    [PREVIEW, VALUE],
  ]) {
    for (const host of [
      "www.cosmosservicesllc.com",
      "cosmos-preview.vercel.app",
    ]) {
      for (const path of paths) {
        const where = `${origin}${path} as ${host}`;
        const body = await rawGet(`${origin}${path}`, {
          ...FORGED,
          host,
          cookie:
            "_vercel_jwt=forged; cosmos-client-auth=kept; __vercel_x=forged",
        });
        expect(body, where).toContain(access(expected));
        expect(body, where).toContain('<p id="infrastructure"></p>');
        expect(body, where).toContain(
          '<p id="cookie">cosmos-client-auth=kept</p>',
        );
        expect(body, where).not.toContain("forged");
      }
    }
  }
});

// The next two check for leaks, not for where redirects may go: destinations are
// the Studio's to keep safe, and tests/paired follows its real ones.
test("an upstream redirect to another host isn't followed by this server", async ({
  request,
}) => {
  const away = encodeURIComponent(elsewhereUrl);
  const response = await request.get(
    `${PREVIEW}/q/synthetic?test-redirect-away=${away}`,
    { maxRedirects: 0 },
  );
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe(elsewhereUrl);
  expect(JSON.stringify(response.headers())).not.toContain(VALUE);
  expect(reached).toHaveLength(0);
});

test("a browser following that redirect takes no credential with it", async ({
  page,
}) => {
  const away = encodeURIComponent(elsewhereUrl);
  await page.goto(`${PREVIEW}/q/synthetic?test-redirect-away=${away}`);
  await expect(page.locator("body")).toHaveText("elsewhere");
  expect(reached).toHaveLength(1);
  const [request] = reached;
  expect(request.url).toBe("/landed");
  const sent = JSON.stringify(request.headers);
  expect(sent).not.toContain(VALUE);
  expect(sent).not.toContain("x-vercel-");
});

test("paths that try to leave the forwarded route stop here", async ({
  request,
}) => {
  for (const path of [
    "/q/%2e%2e/login",
    "/q/%2E%2E/api/customer",
    "/q/..%2f..%2flogin",
    "/q/synthetic%2f..%2f..%2flogin",
    "/q/%5c%5cevil.example",
    "/me/%2fevil.example",
  ]) {
    const response = await request.get(`${PREVIEW}${path}`, {
      maxRedirects: 0,
    });
    expect(response.status(), path).toBe(404);
    expect(await response.text(), path).not.toContain("Studio stub");
  }
});

test("forwarded Server Actions keep their method, body and headers", async ({
  request,
}) => {
  const response = await request.post(`${PREVIEW}/q/synthetic`, {
    headers: {
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
  expect(body).toContain(access(VALUE));
});

test("the site's own pages don't send or show it", async ({ request }) => {
  const response = await request.get(`${PREVIEW}/`);
  expect(await response.text()).not.toContain(VALUE);
});
