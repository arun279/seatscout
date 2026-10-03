import { defineConfig } from "@playwright/test";

const PORT = 8081;

export default defineConfig({
  testDir: "tests/app",
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `pnpm exec serve apps/native/dist --single --no-clipboard --listen ${PORT}`,
    url: `http://localhost:${PORT}/`,
  },
});
