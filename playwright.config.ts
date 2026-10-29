import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

/**
 * Browser tests against a production build: `npm run test:e2e` builds first.
 * Quote delivery is not configured for the test server, so the quote tests
 * check the honest "not connected" message and stub /api/quote for success.
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
      testIgnore: /\.mobile\.spec\.ts$/,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      testMatch: /(quote|\.mobile)\.spec\.ts$/,
    },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    // Keep any real delivery credentials out of the test server.
    env: {
      SUPABASE_URL: "",
      SUPABASE_SECRET_KEY: "",
      RESEND_API_KEY: "",
      QUOTE_TO_EMAIL: "",
      QUOTE_FROM_EMAIL: "",
    },
  },
});
