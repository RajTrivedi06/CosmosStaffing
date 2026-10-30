import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;
const STUDIO_STUB_PORT = 3299;
const STUDIO_STUB_ORIGIN = `http://127.0.0.1:${STUDIO_STUB_PORT}`;

/** Synthetic Studio only; no real delivery credentials enter these test servers. */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
      testIgnore: /\.mobile\.spec\.ts$/,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      testMatch: /(quote|\.mobile)\.spec\.ts$/,
    },
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
      env: {
        NEXT_DIST_DIR: ".next-test",
        STUDIO_ORIGIN: STUDIO_STUB_ORIGIN,
        QUOTE_DELIVERY_MODE: process.env.E2E_QUOTE_MODE || "legacy",
        QUOTE_STUDIO_TEST_ENABLED: "false",
        STUDIO_INTAKE_URL: "",
        WEBSITE_INTAKE_SECRET: "",
        SUPABASE_URL: "",
        SUPABASE_SECRET_KEY: "",
        RESEND_API_KEY: "",
        QUOTE_TO_EMAIL: "",
        QUOTE_FROM_EMAIL: "",
      },
    },
  ],
});
