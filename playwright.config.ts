import { defineConfig, devices } from "@playwright/test";

const repository = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "reading-atlas";
const pagesBase = process.env.GITHUB_ACTIONS === "true" ? `/${repository}` : "";
const serverUrl = `http://127.0.0.1:4325${pagesBase}/`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: serverUrl,
    trace: "on-first-retry"
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], browserName: "chromium" } }
  ],
  webServer: {
    command: "node scripts/serve-dist.mjs",
    url: serverUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
});
