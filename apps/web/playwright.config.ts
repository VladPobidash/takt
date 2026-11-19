import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

/** End-to-end smoke tests against the production build, in a phone viewport (ADR 0006). */
export default defineConfig({
  testDir: "e2e",
  outputDir: "e2e/.results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Pixel 7"],
    viewport: { width: 390, height: 844 },
    trace: "off",
  },
  webServer: {
    // The same server that runs in production (ADR 0011).
    command: "pnpm build && node server.mjs",
    env: { PORT: String(PORT) },
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
});
