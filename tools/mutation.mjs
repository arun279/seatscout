import { spawnSync } from "node:child_process";
import { globSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const SHARDS = "stryker.shards.json";
const TREE = "{apps,packages,tools}/*/src/**/*.{ts,tsx}";
const root = fileURLToPath(new URL("..", import.meta.url));

const { values } = parseArgs({
  options: {
    shard: { type: "string" },
    incremental: { type: "boolean", default: false },
  },
});

const refuse = (message) => {
  process.stderr.write(`${message}\n`);
  process.exit(1);
};

if (values.incremental && values.shard === undefined) {
  refuse(
    "--incremental needs --shard: every shard writes the same incremental file, so judging them in turn would leave only the last one's.",
  );
}

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

const failed = [];
for (const shard of judged) {
  const passed =
    succeeded(
      "pnpm",
      [
        "exec",
        "stryker",
        "run",
        ...(values.incremental ? ["--incremental"] : []),
      ],
      { MUTATION_SHARD: shard.id },
    ) &&
    succeeded("node", [
      "tools/no-empty-run/src/index.ts",
      "mutation",
      shard.report,
    ]);
  if (!passed) failed.push(shard.id);
}

if (failed.length > 0) {
  refuse(`The mutation gate refused ${failed.join(", ")}.`);
}
