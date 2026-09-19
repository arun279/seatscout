import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { IGNORED, said } from "./planted.fixtures.ts";

const WORKSPACES = ["packages/kept", "apps/left"];
const ORPHANED = "leaves these files to no shard, so nothing mutates them";

const dividedInto = (...mutated: readonly string[]) => {
  mkdirSync(IGNORED, { recursive: true });
  const at = mkdtempSync(join(IGNORED, "shards-"));
  mkdirSync(join(at, "tools"));
  copyFileSync("tools/mutation.mjs", join(at, "tools/mutation.mjs"));
  for (const workspace of WORKSPACES) {
    mkdirSync(join(at, workspace, "src"), { recursive: true });
    writeFileSync(join(at, workspace, "src/index.ts"), "export {};\n");
  }
  writeFileSync(
    join(at, "stryker.shards.json"),
    JSON.stringify(
      mutated.map((workspace) => ({
        id: workspace,
        mutate: [`${workspace}/src/**/*.{ts,tsx}`],
      })),
    ),
  );
  try {
    return spawnSync(
      "node",
      [join(at, "tools/mutation.mjs"), "--shard", "unlisted"],
      { encoding: "utf8" },
    );
  } finally {
    rmSync(at, { recursive: true, force: true });
  }
};

describe("the planted red under the division of the mutation gate", () => {
  it("refuses a shard list that leaves a workspace's source to no shard, and names the file", () => {
    const run = dividedInto("packages/kept");

    expect(run.status).toBe(1);
    expect(said(run)).toContain(`${ORPHANED}:\napps/left/src/index.ts`);
  });

  it("passes a list that reaches every workspace, so it is not refusing every list", () => {
    const run = dividedInto(...WORKSPACES);

    expect(said(run)).not.toContain(ORPHANED);
    expect(said(run)).toContain("names no shard called unlisted");
  });
});
