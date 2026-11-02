import { execFileSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;
/** A local stand-in for the Operations Studio (tests/e2e/studio-stub.mjs). */
const STUDIO_STUB_PORT = 3299;
const STUDIO_STUB_ORIGIN = `http://127.0.0.1:${STUDIO_STUB_PORT}`;

/**
 * Real client-account tests (*.auth.spec.ts), opt-in with AUTH_E2E=1 (see
 * `npm run test:e2e:auth`). They run a second server against this repo's own
 * local Supabase Auth (supabase/config.toml) and read emails from its Mailpit.
 * Real Supabase Auth, synthetic accounts; not paired with the Studio.
 */
const AUTH_PORT = 3201;
/**
 * Customer-mode tests (*.customer.spec.ts), also under AUTH_E2E: the site in
 * QUOTE_DELIVERY_MODE=customer against real local Auth and a MOCK of the
 * Studio's customer API (tests/e2e/customer-api-stub.mjs). Not paired
 * evidence: the mock does not verify tokens or touch a Studio database.
 */
const CUSTOMER_PORT = 3202;
const CUSTOMER_STUB_PORT = 3398;
const CUSTOMER_STUB_SECRET = "synthetic-only-customer-api-secret-01";
const AUTH_E2E = process.env.AUTH_E2E === "1";
/** The same build as a paired Vercel Preview (tests/e2e/studio-access.spec.ts). */
const PREVIEW_PORT = 3203;
/** And one whose runtime settings no longer match where the build forwards. */
const DRIFTED_PORT = 3204;
/** And one with no token, as if Vercel's request context had none. */
const TOKENLESS_PORT = 3205;
/** Shaped like a Vercel token so the real helper returns it; signed by nobody. */
const SYNTHETIC_OIDC_TOKEN =
  "eyJhbGciOiJub25lIn0.eyJleHAiOjQxMDI0NDQ4MDB9.synthetic-only";
function localAuthKey() {
  const env = execFileSync("supabase", ["status", "-o", "env"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const key = /^PUBLISHABLE_KEY="?([^"\n]+)"?$/m.exec(env)?.[1];
  if (!key) throw new Error("Start the local Supabase stack: supabase start");
  return key;
}
/** Test servers never inherit .env.local's account settings. */
const NO_ACCOUNTS = {
  AUTH_SUPABASE_URL: "",
  AUTH_SUPABASE_PUBLISHABLE_KEY: "",
};
const QUIET_DELIVERY = {
  QUOTE_DELIVERY_MODE: process.env.E2E_QUOTE_MODE || "legacy",
  QUOTE_STUDIO_TEST_ENABLED: "false",
  STUDIO_INTAKE_URL: "",
  WEBSITE_INTAKE_SECRET: "",
  SUPABASE_URL: "",
  SUPABASE_SECRET_KEY: "",
  RESEND_API_KEY: "",
  QUOTE_TO_EMAIL: "",
  QUOTE_FROM_EMAIL: "",
};

/**
 * Browser tests against a production build: `npm run test:e2e` builds first,
 * with STUDIO_ORIGIN pointing the Studio's forwarded paths at a local stub,
 * so no test ever reaches the real Studio. Quote delivery is not configured
 * for the test server, so the quote tests check the honest "not connected"
 * message and stub /api/quote for success.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
      testIgnore: /\.(mobile|auth|customer)\.spec\.ts$/,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      testMatch: /(quote|\.mobile)\.spec\.ts$/,
    },
    ...(AUTH_E2E
      ? [
          {
            name: "auth-desktop",
            use: {
              ...devices["Desktop Chrome"],
              baseURL: `http://127.0.0.1:${AUTH_PORT}`,
            },
            testMatch: /\.auth\.spec\.ts$/,
          },
          {
            name: "auth-mobile",
            use: {
              ...devices["Pixel 7"],
              baseURL: `http://127.0.0.1:${AUTH_PORT}`,
            },
            testMatch: /\.auth\.spec\.ts$/,
          },
          {
            name: "customer-desktop",
            use: {
              ...devices["Desktop Chrome"],
              baseURL: `http://127.0.0.1:${CUSTOMER_PORT}`,
            },
            testMatch: /\.customer\.spec\.ts$/,
          },
          {
            name: "customer-mobile",
            use: {
              ...devices["Pixel 7"],
              baseURL: `http://127.0.0.1:${CUSTOMER_PORT}`,
            },
            testMatch: /\.customer\.spec\.ts$/,
          },
        ]
      : []),
  ],
  webServer: [
    {
      command: "node tests/e2e/studio-stub.mjs",
      url: `${STUDIO_STUB_ORIGIN}/health`,
      reuseExistingServer: !process.env.CI,
      env: { STUDIO_STUB_PORT: String(STUDIO_STUB_PORT) },
    },
    {
      command: `npm run start -- -p ${PORT}`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      // Keep any real delivery credentials out of the test server.
      env: {
        NEXT_DIST_DIR: ".next-test",
        STUDIO_ORIGIN: STUDIO_STUB_ORIGIN,
        ...QUIET_DELIVERY,
        ...NO_ACCOUNTS,
      },
    },
    {
      command: `npm run start -- -p ${PREVIEW_PORT}`,
      url: `http://localhost:${PREVIEW_PORT}`,
      reuseExistingServer: !process.env.CI,
      env: {
        NEXT_DIST_DIR: ".next-test",
        VERCEL_ENV: "preview",
        STUDIO_ORIGIN: STUDIO_STUB_ORIGIN,
        STUDIO_APPROVED_ORIGIN: STUDIO_STUB_ORIGIN,
        VERCEL_OIDC_TOKEN: SYNTHETIC_OIDC_TOKEN,
        ...QUIET_DELIVERY,
        ...NO_ACCOUNTS,
      },
    },
    {
      command: `npm run start -- -p ${DRIFTED_PORT}`,
      url: `http://localhost:${DRIFTED_PORT}`,
      reuseExistingServer: !process.env.CI,
      env: {
        NEXT_DIST_DIR: ".next-test",
        VERCEL_ENV: "preview",
        STUDIO_ORIGIN: "https://approved-studio-preview.example",
        STUDIO_APPROVED_ORIGIN: "https://approved-studio-preview.example",
        VERCEL_OIDC_TOKEN: SYNTHETIC_OIDC_TOKEN,
        ...QUIET_DELIVERY,
        ...NO_ACCOUNTS,
      },
    },
    {
      command: `npm run start -- -p ${TOKENLESS_PORT}`,
      url: `http://localhost:${TOKENLESS_PORT}`,
      reuseExistingServer: !process.env.CI,
      env: {
        NEXT_DIST_DIR: ".next-test",
        VERCEL_ENV: "preview",
        STUDIO_ORIGIN: STUDIO_STUB_ORIGIN,
        STUDIO_APPROVED_ORIGIN: STUDIO_STUB_ORIGIN,
        ...QUIET_DELIVERY,
        ...NO_ACCOUNTS,
      },
    },
    ...(AUTH_E2E
      ? [
          {
            command: `npm run start -- -p ${AUTH_PORT}`,
            url: `http://127.0.0.1:${AUTH_PORT}`,
            reuseExistingServer: false,
            env: {
              NEXT_DIST_DIR: ".next-test",
              STUDIO_ORIGIN: STUDIO_STUB_ORIGIN,
              ...QUIET_DELIVERY,
              // The quote limiter trusts X-Forwarded-For only behind Vercel's
              // proxy; here it lets each sending test have its own bucket.
              VERCEL: "1",
              AUTH_SUPABASE_URL: "http://127.0.0.1:54621",
              AUTH_SUPABASE_PUBLISHABLE_KEY: localAuthKey(),
              // Cloudflare's always-pass test site key (supabase/config.toml).
              TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
            },
          },
          {
            command: "node tests/e2e/customer-api-stub.mjs",
            url: `http://127.0.0.1:${CUSTOMER_STUB_PORT}/health`,
            reuseExistingServer: false,
            env: {
              CUSTOMER_STUB_PORT: String(CUSTOMER_STUB_PORT),
              CUSTOMER_STUB_SECRET,
            },
          },
          {
            command: `npm run start -- -p ${CUSTOMER_PORT}`,
            url: `http://127.0.0.1:${CUSTOMER_PORT}`,
            reuseExistingServer: false,
            env: {
              NEXT_DIST_DIR: ".next-test",
              STUDIO_ORIGIN: STUDIO_STUB_ORIGIN,
              ...QUIET_DELIVERY,
              QUOTE_DELIVERY_MODE: "customer",
              QUOTE_STUDIO_TEST_ENABLED: "true",
              STUDIO_CUSTOMER_API_URL: `http://127.0.0.1:${CUSTOMER_STUB_PORT}/api/customer/v2`,
              WEBSITE_INTAKE_SECRET: CUSTOMER_STUB_SECRET,
              VERCEL: "1",
              AUTH_SUPABASE_URL: "http://127.0.0.1:54621",
              AUTH_SUPABASE_PUBLISHABLE_KEY: localAuthKey(),
              // Cloudflare's always-pass test site key (supabase/config.toml).
              TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
            },
          },
        ]
      : []),
  ],
});
