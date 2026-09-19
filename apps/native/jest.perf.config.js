import { shared } from "./jest.shared.js";

export default {
  ...shared,
  rootDir: ".",
  preset: "jest-expo/ios",
  testMatch: ["<rootDir>/test/**/*.perf-test.tsx"],
  testTimeout: 120_000,
};
