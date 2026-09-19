import { defineConfig } from "@playwright/test";

const PORT = 8787;
const NOWHERE = "http://127.0.0.1:9";

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `pnpm exec wrangler dev --port ${PORT} --var UPSTREAM_ORIGIN:${NOWHERE}`,
    cwd: "apps/proxy",
    env: { WRANGLER_SEND_METRICS: "false" },
    url: `http://localhost:${PORT}/`,
  },
});
