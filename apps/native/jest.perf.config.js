import { platform } from "./jest.shared.js";

const shared = platform("ios");

export default {
  ...shared,
  rootDir: ".",
  setupFilesAfterEnv: [
    ...shared.setupFilesAfterEnv,
    "<rootDir>/test/reassure.cjs",
  ],
  testMatch: ["<rootDir>/test/**/*.perf-test.tsx"],
  testTimeout: 120_000,
};
