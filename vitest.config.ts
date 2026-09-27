import { defaultExclude, defineConfig } from "vitest/config";

const exclude = [
  ...defaultExclude,
  "**/dist/**",
  "**/*.live.test.ts",
  "apps/native/**",
];
const screenSetupFiles = [
  "apps/web/test/dialogs.ts",
  "apps/web/test/strict-console.ts",
];

const WEB = "apps/web";

export const configFor = (tests = "{apps,packages,tools}/*") =>
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: "node",
            include: [`${tests}/**/*.{test,spec}.?(c|m)[jt]s`],
            exclude,
          },
        },
        {
          extends: true,
          test: {
            name: "screen",
            environment: "jsdom",
            include: ["{apps,packages,tools}/*", WEB].includes(tests)
              ? [`${WEB}/src/**/*.test.tsx`]
              : [],
            setupFiles: screenSetupFiles,
            exclude,
          },
        },
      ],
    },
  });

export default configFor();
