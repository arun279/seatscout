import { platform } from "./jest.shared.js";

export default {
  ...platform("ios"),
  rootDir: ".",
  testMatch: ["<rootDir>/test/**/*.perf-test.tsx"],
  testTimeout: 120_000,
};
