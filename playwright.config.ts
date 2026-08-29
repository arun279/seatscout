import { defineConfig } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `pnpm exec vite preview --port ${PORT} --strictPort`,
    cwd: "apps/web",
    url: `http://localhost:${PORT}`,
  },
});
