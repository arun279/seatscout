import { defaultExclude, defineConfig } from "vitest/config";

const exclude = [...defaultExclude, "**/dist/**", "**/*.live.test.ts"];

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "node",
          include: ["{apps,packages,tools}/*/**/*.{test,spec}.?(c|m)[jt]s"],
          exclude,
        },
      },
      {
        test: {
          name: "screen",
          environment: "jsdom",
          include: ["apps/web/src/**/*.test.tsx"],
          setupFiles: [
            "apps/web/test/dialogs.ts",
            "apps/web/test/strict-console.ts",
          ],
          exclude,
        },
      },
    ],
  },
});
