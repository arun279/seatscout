import { defaultExclude, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["{apps,packages,tools}/*/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
    exclude: [...defaultExclude, "**/dist/**"],
  },
});
