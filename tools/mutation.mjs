import { spawnSync } from "node:child_process";
import { existsSync, globSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const SHARDS = "stryker.shards.json";
const TREE = "{apps,packages,tools}/*/src/**/*.{ts,tsx}";
const FILES_PER_JOB = { jest: 2, vitest: 8 };
const root = fileURLToPath(new URL("..", import.meta.url));

const { values } = parseArgs({
  options: {
    shard: { type: "string" },
    files: { type: "string" },
    plan: { type: "string" },
  },
});
const NOT_PRODUCTION = /\.(test|spec|fixtures)\.[cm]?[jt]sx?$/;
const TEST = /\.(test|spec)(\.[cm]?[jt]sx?)$/;

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

const git = (...args) => {
  const run = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (run.status !== 0) refuse(`git ${args.join(" ")}\n${run.stderr}`);
  return run.stdout.split("\n").filter(Boolean);
};

const chunked = (files, size) =>
  Array.from({ length: Math.ceil(files.length / size) }, (_, index) =>
    files.slice(index * size, (index + 1) * size),
  );

if (values.plan !== undefined) {
  const changed = git(
    "diff",
    "--name-only",
    "--diff-filter=d",
    `${values.plan}...HEAD`,
  );
  const touched = new Set(
    changed
      .map((file) => file.replace(TEST, "$2"))
      .filter((file) => existsSync(`${root}${file}`)),
  );
  const jobs = shards.flatMap((shard) =>
    chunked(
      sourcesOf(shard).filter((file) => touched.has(file)),
      FILES_PER_JOB[shard.runner],
    ).map((files) => ({ shard: shard.id, files: files.join(",") })),
  );
  process.stdout.write(`${JSON.stringify(jobs)}\n`);
  process.exit(0);
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
        ) &&
        (values.files !== undefined ||
          succeeded("node", [
            "tools/no-empty-run/src/index.ts",
            "mutation",
            shard.report,
          ]))
      ),
  )
  .map((shard) => shard.id);

if (failed.length > 0) {
  refuse(`The mutation gate refused ${failed.join(", ")}.`);
}
