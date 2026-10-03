import { defaultExclude, defineConfig } from "vitest/config";

export const configFor = (tests = "{apps,packages,tools}/*") =>
  defineConfig({
    test: {
      include: [`${tests}/**/*.{test,spec}.?(c|m)[jt]s`],
      exclude: [
        ...defaultExclude,
        "**/dist/**",
        "**/*.live.test.ts",
        "apps/native/**",
      ],
    },
  });

export default configFor();
