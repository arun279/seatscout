import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";

const PLANTED = "tools/planted-red/planted";
export const IGNORED = "reports/planted";

export const ran = (...command: string[]): SpawnSyncReturns<string> =>
  spawnSync("pnpm", ["exec", ...command], { encoding: "utf8" });

export const said = (run: SpawnSyncReturns<string>): string =>
  `${run.stdout}${run.stderr}`;

export const overPlanted = <Verdict>(
  fixture: string,
  reach: (at: string) => Verdict,
  from: string = PLANTED,
): Verdict => {
  const planted = readdirSync(`${from}/${fixture}`);
  if (planted.length === 0)
    throw new Error(`${from}/${fixture} plants no file to run a gate over`);
  mkdirSync(IGNORED, { recursive: true });
  const at = mkdtempSync(join(IGNORED, `${fixture}-`));
  for (const named of planted)
    copyFileSync(
      `${from}/${fixture}/${named}`,
      join(at, named.replace(/\.txt$/, "")),
    );
  const reached = reach(at);
  rmSync(at, { recursive: true, force: true });
  return reached;
};
