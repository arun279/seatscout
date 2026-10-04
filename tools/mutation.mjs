import { spawnSync } from "node:child_process";
import { globSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { plan } from "./mutation-plan.mjs";

const SHARDS = "stryker.shards.json";
const TREE = "{apps,packages,tools}/*/src/**/*.{ts,tsx}";
const root = fileURLToPath(new URL("..", import.meta.url));

const { values } = parseArgs({
  options: {
    shard: { type: "string" },
    files: { type: "string" },
    plan: { type: "string" },
  },
});

const refuse = (message) => {
  process.stderr.write(`${message}\n`);
  process.exit(1);
};

const shards = JSON.parse(readFileSync(`${root}${SHARDS}`, "utf8"));

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

if (values.plan !== undefined) {
  const jobs = await plan({ base: values.plan, root, shards }).catch((error) =>
    refuse(error.message),
  );
  process.stdout.write(`${JSON.stringify(jobs)}\n`);
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
