import { defineConfig, devices } from "@playwright/test";

/**
 * REAL paired tests: this website and a running Studio sharing one isolated
 * Supabase Auth/database project, as assigned by the Studio's integration
 * lead. Starts nothing; the website must already be serving the candidate on
 * PAIRED_WEBSITE. Never point this at a shared or hosted environment.
 * Run with `npx playwright test -c playwright.paired.config.ts`.
 */
export default defineConfig({
  testDir: "tests/paired",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 120_000,
  use: {
    baseURL: process.env.PAIRED_WEBSITE ?? "http://localhost:3350",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "paired-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
      },
    },
    { name: "paired-phone", use: { ...devices["Pixel 7"] } },
  ],
});
