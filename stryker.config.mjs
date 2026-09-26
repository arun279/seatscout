import { readFileSync } from "node:fs";

const RUNNERS = {
  vitest: () => ({
    testRunner: "vitest",
    incrementalFile: "reports/stryker-incremental.json",
    vitest: { related: false, configFile: "vitest.stryker.config.ts" },
  }),
  jest: (shard) => ({
    testRunner: "jest",
    ignorers: ["drawn-values"],
    coverageAnalysis: "off",
    incrementalFile: "reports/stryker-native-incremental.json",
    jest: {
      projectType: "custom",
      configFile: shard.jest,
      enableFindRelatedTests: true,
    },
  }),
};

const NOT_PRODUCTION = [
  "!**/*.{test,spec}.?(c|m)[jt]s?(x)",
  "!**/*.fixtures.?(c|m)[jt]s?(x)",
];

const NOTHING = {
  runner: "vitest",
  mutate: [],
  report: "reports/mutation/no-shard.json",
};

const shards = JSON.parse(
  readFileSync(new URL("stryker.shards.json", import.meta.url), "utf8"),
);

const named = process.env["MUTATION_SHARD"];
const shard =
  named === undefined ? NOTHING : shards.find((each) => each.id === named);

if (shard === undefined) {
  throw new Error(
    `MUTATION_SHARD names ${named}, and stryker.shards.json names ${shards
      .map((each) => each.id)
      .join(", ")}.`,
  );
}

export default {
  ...RUNNERS[shard.runner](shard),
  plugins: [
    "@stryker-mutator/vitest-runner",
    "@stryker-mutator/jest-runner",
    "./tools/stryker-style-tables.mjs",
  ],
  ignorePatterns: ["/tsconfig.json"],
  mutate: [...shard.mutate, ...NOT_PRODUCTION],
  cleanTempDir: "always",
  reporters: ["clear-text", "json"],
  jsonReporter: { fileName: shard.report },
  thresholds: { break: 100 },
};
