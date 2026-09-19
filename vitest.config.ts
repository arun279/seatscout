import { configDefaults, defaultExclude, defineConfig } from "vitest/config";

const exclude = [...defaultExclude, "**/dist/**", "**/*.live.test.ts"];
const screenSetupFiles = [
  "apps/web/test/dialogs.ts",
  "apps/web/test/strict-console.ts",
];
const anywhere = (name: string) => ["**", name, "**"].join("/");

export default defineConfig({
  test: {
    forceRerunTriggers: [
      ...configDefaults.forceRerunTriggers,
      ...["vitest*.config.ts", "tsconfig*.json", "pnpm-lock.yaml"].map(
        anywhere,
      ),
      ...screenSetupFiles.map(anywhere),
    ],
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          include: ["{apps,packages,tools}/*/**/*.{test,spec}.?(c|m)[jt]s"],
          exclude,
        },
      },
      {
        extends: true,
        test: {
          name: "screen",
          environment: "jsdom",
          include: ["apps/web/src/**/*.test.tsx"],
          setupFiles: screenSetupFiles,
          exclude,
        },
      },
    ],
  },
});
