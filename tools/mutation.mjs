import { spawnSync } from "node:child_process";
import { globSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const SHARDS = "stryker.shards.json";
const TREE = "{apps,packages,tools}/*/src/**/*.{ts,tsx}";
const FILES_PER_JOB = { jest: 2, vitest: 8 };
const MACHINERY = [
  SHARDS,
  "stryker.config.mjs",
  "vitest.config.ts",
  "vitest.stryker.config.ts",
  "tools/mutation.mjs",
  "tools/stryker-style-tables.mjs",
  "apps/native/jest.config.js",
  "apps/native/jest.shared.js",
  "pnpm-lock.yaml",
];
const root = fileURLToPath(new URL("..", import.meta.url));

const { values } = parseArgs({
  options: {
    shard: { type: "string" },
    files: { type: "string" },
    plan: { type: "string" },
  },
});
const NOT_PRODUCTION = /\.(?:test|spec|fixtures)\.[cm]?[jt]sx?$/;
const TEST = /\.(?:test|spec)(\.[cm]?[jt]sx?)$/;
const RELATIVE_IMPORT = /(?:from|import)\s+["'](\.{1,2}\/[^"']+)["']/g;

const refuse = (message) => {
  process.stderr.write(`${message}\n`);
  process.exit(1);
};

const shards = JSON.parse(readFileSync(`${root}${SHARDS}`, "utf8"));
const sourcesOf = (shard) =>
  globSync(shard.mutate, { cwd: root }).filter(
    (file) => !NOT_PRODUCTION.test(file),
  );

const mutated = new Set(
  globSync(
    shards.flatMap((shard) => shard.mutate),
    { cwd: root },
  ),
);
const orphans = globSync(TREE, { cwd: root }).filter(
  (file) => !mutated.has(file),
);
if (orphans.length > 0) {
  refuse(
    `${SHARDS} leaves these files to no shard, so nothing mutates them:\n${orphans.join("\n")}`,
  );
}

const chunked = (files, size) =>
  Array.from({ length: Math.ceil(files.length / size) }, (_, index) =>
    files.slice(index * size, (index + 1) * size),
  );

const imported = (file) =>
  [...readFileSync(`${root}${file}`, "utf8").matchAll(RELATIVE_IMPORT)]
    .map(([, specifier]) =>
      normalize(join(dirname(file), specifier)).replace(/\.js$/, ""),
    )
    .flatMap((base) => [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`]);

const reachedBy = (file) =>
  NOT_PRODUCTION.test(file)
    ? [file.replace(TEST, "$1"), ...imported(file)]
    : [file];

const plan = (base) => {
  const run = spawnSync(
    "git",
    ["diff", "--name-only", "--diff-filter=d", `${base}...HEAD`],
    { cwd: root, encoding: "utf8" },
  );
  if (run.status !== 0) refuse(`git diff against ${base}\n${run.stderr}`);
  const changed = run.stdout.split("\n").filter(Boolean);
  const touched = new Set(changed.flatMap(reachedBy));
  const canary = changed.some((file) => MACHINERY.includes(file));
  return shards.flatMap((shard) => {
    const picked = sourcesOf(shard).filter((file) => touched.has(file));
    const judged = canary && picked.length === 0 ? [shard.canary] : picked;
    return chunked(judged, FILES_PER_JOB[shard.runner]).map((files) => ({
      shard: shard.id,
      files: files.join(","),
    }));
  });
};

if (values.plan !== undefined) {
  process.stdout.write(`${JSON.stringify(plan(values.plan))}\n`);
  process.exit(0);
}

if (values.files !== undefined && values.shard === undefined) {
  refuse(
    "--files needs --shard: a file is judged by the tests of the shard that owns it, and every other shard would score it as uncovered.",
  );
}

const judged =
  values.shard === undefined
    ? shards
    : shards.filter((shard) => shard.id === values.shard);

if (judged.length === 0) {
  refuse(
    `${SHARDS} names no shard called ${values.shard}. It names ${shards
      .map((shard) => shard.id)
      .join(", ")}.`,
  );
}

const succeeded = (command, args, environment = {}) =>
  spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...environment },
  }).status === 0;

const onlyIgnored = (report) =>
  Object.values(JSON.parse(readFileSync(`${root}${report}`, "utf8")).files)
    .flatMap((file) => file.mutants)
    .every((mutant) => mutant.status === "Ignored");

const weighedSomething = (shard) =>
  (values.files !== undefined && onlyIgnored(shard.report)) ||
  succeeded("node", [
    "tools/no-empty-run/src/index.ts",
    "mutation",
    shard.report,
  ]);

const failed = judged
  .filter(
    (shard) =>
      !(
        succeeded(
          "pnpm",
          [
            "exec",
            "stryker",
            "run",
            ...(values.files === undefined ? [] : ["--mutate", values.files]),
          ],
          { MUTATION_SHARD: shard.id },
        ) && weighedSomething(shard)
      ),
  )
  .map((shard) => shard.id);

if (failed.length > 0) {
  refuse(`The mutation gate refused ${failed.join(", ")}.`);
}
