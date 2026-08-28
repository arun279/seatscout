import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["{apps,packages,tools}/*/**/*.live.test.ts"],
    globalSetup: ["tools/live-answers.mjs"],
  },
});
