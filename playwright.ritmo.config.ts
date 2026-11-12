import { defineConfig } from "@playwright/test";

const port = 4177;

export default defineConfig({
  testDir: "./tests",
  testMatch: "ritmo-v13.spec.ts",
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1100, height: 1100 },
  },
  webServer: {
    command: `pnpm exec vite --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}/?flow=training`,
    reuseExistingServer: true,
  },
});
