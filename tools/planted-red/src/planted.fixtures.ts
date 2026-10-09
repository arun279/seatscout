import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";

const PLANTED = "tools/planted-red/planted";
const LINT_SETUP = ["biome.json", "tools/lint"];
const MUTATION_TOOLS = [
  "mutation.mjs",
  "mutation-plan.mjs",
  "stryker-exact-ranges.mjs",
  "stryker-style-tables.mjs",
];
export const IGNORED = "reports/planted";
export const APP_SOURCE = "apps/native/src";

export const copyMutationTools = (at: string): string => {
  mkdirSync(join(at, "tools"));
  for (const tool of MUTATION_TOOLS)
    copyFileSync(`tools/${tool}`, join(at, "tools", tool));
  return join(at, "tools/mutation.mjs");
};

export const ran = (...command: string[]): SpawnSyncReturns<string> =>
  spawnSync("pnpm", ["exec", ...command], { encoding: "utf8" });

export const said = (run: SpawnSyncReturns<string>): string =>
  `${run.stdout}${run.stderr}`;

export const biomeIn = (
  root: string,
  ...command: string[]
): SpawnSyncReturns<string> => {
  for (const path of LINT_SETUP)
    cpSync(path, join(root, path), { recursive: true });
  return spawnSync(
    "pnpm",
    ["exec", "biome", "lint", "--vcs-enabled=false", ...command],
    { cwd: root, encoding: "utf8" },
  );
};

export const biomeOver = (
  rule: string,
  root: string,
  ...targets: string[]
): SpawnSyncReturns<string> => biomeIn(root, `--only=${rule}`, ...targets);

export const overPlanted = <Verdict>(
  fixture: string,
  reach: (at: string) => Verdict,
  { from = PLANTED, beneath = "." }: { from?: string; beneath?: string } = {},
): Verdict => {
  const planted = readdirSync(`${from}/${fixture}`);
  if (planted.length === 0)
    throw new Error(`${from}/${fixture} plants no file to run a gate over`);
  mkdirSync(IGNORED, { recursive: true });
  const at = mkdtempSync(join(IGNORED, `${fixture}-`));
  mkdirSync(join(at, beneath), { recursive: true });
  for (const named of planted)
    copyFileSync(
      `${from}/${fixture}/${named}`,
      join(at, beneath, named.replace(/\.txt$/, "")),
    );
  try {
    return reach(at);
  } finally {
    rmSync(at, { recursive: true, force: true });
  }
};
