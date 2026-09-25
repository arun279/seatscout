import { defineConfig } from "@playwright/test";

const PORT = 8787;
const APP_PORT = 8081;
const NOWHERE = "http://127.0.0.1:9";

export default defineConfig({
  projects: [
    {
      name: "web",
      testDir: "tests/e2e",
      use: { baseURL: `http://localhost:${PORT}` },
    },
    {
      name: "app",
      testDir: "tests/app",
      use: { baseURL: `http://localhost:${APP_PORT}` },
    },
  ],
  webServer: [
    {
      command: `pnpm exec wrangler dev --port ${PORT} --var UPSTREAM_ORIGIN:${NOWHERE}`,
      cwd: "apps/proxy",
      env: { WRANGLER_SEND_METRICS: "false" },
      url: `http://localhost:${PORT}/`,
    },
    {
      command: `pnpm exec serve apps/native/dist --single --no-clipboard --listen ${APP_PORT}`,
      url: `http://localhost:${APP_PORT}/`,
    },
  ],
});
