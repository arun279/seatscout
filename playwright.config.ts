import { defineConfig } from "@playwright/test";

const SHELL_ORIGIN = "http://localhost:4173";

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: SHELL_ORIGIN },
  webServer: {
    command: "pnpm exec vite preview --port 4173 --strictPort",
    cwd: "apps/web",
    url: SHELL_ORIGIN,
  },
});
