import { defineConfig } from "@playwright/test";

const PORT = 8787;

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `pnpm exec wrangler dev --port ${PORT}`,
    cwd: "apps/proxy",
    env: { WRANGLER_SEND_METRICS: "false" },
    url: `http://localhost:${PORT}/`,
  },
});
