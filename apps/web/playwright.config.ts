import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const executablePath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE;
const useExternalServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL,
    trace: "on-first-retry",
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  webServer: useExternalServer
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: true,
      },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
