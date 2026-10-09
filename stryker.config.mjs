import { readFileSync } from "node:fs";

const STRYKER_DEFAULT_TIMEOUT_FACTOR = 1.5;

const JEST_RUNNERS_AT_ONCE = 2;

const LOADING_TEST_FILES_AGAIN_MS = 100_000;

const projectCountIn = async (config) =>
  (await import(new URL(config, import.meta.url))).default.projects.length;

const RUNNERS = {
  vitest: () => ({
    testRunner: "vitest",
    vitest: { related: false, configFile: "vitest.stryker.config.ts" },
  }),
  jest: async (shard) => ({
    testRunner: "jest",
    ignorers: ["drawn-values", "exact-ranges"],
    coverageAnalysis: "perTest",
    dryRunTimeoutMinutes: 15,
    concurrency: JEST_RUNNERS_AT_ONCE,
    timeoutFactor:
      STRYKER_DEFAULT_TIMEOUT_FACTOR * (await projectCountIn(shard.jest)),
    timeoutMS: LOADING_TEST_FILES_AGAIN_MS,
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
  ...(await RUNNERS[shard.runner](shard)),
  plugins: [
    "@stryker-mutator/vitest-runner",
    "@stryker-mutator/jest-runner",
    "./tools/stryker-style-tables.mjs",
    "./tools/stryker-exact-ranges.mjs",
  ],
  ignorePatterns: ["/tsconfig.json"],
  mutate: [...shard.mutate, ...NOT_PRODUCTION],
  cleanTempDir: "always",
  reporters: ["clear-text", "json"],
  jsonReporter: { fileName: shard.report },
  thresholds: { break: 100 },
};
