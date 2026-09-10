import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PLANTED = "tools/planted-red/planted";
const IGNORED = "reports/planted-cycles";

const biomeOver = (fixture: string) => {
  mkdirSync(IGNORED, { recursive: true });
  const at = mkdtempSync(join(IGNORED, `${fixture}-`));
  for (const named of readdirSync(`${PLANTED}/${fixture}`))
    copyFileSync(
      `${PLANTED}/${fixture}/${named}`,
      join(at, named.replace(/\.txt$/, "")),
    );
  const run = spawnSync(
    "pnpm",
    [
      "exec",
      "biome",
      "lint",
      "--vcs-enabled=false",
      "--only=suspicious/noImportCycles",
      at,
    ],
    { encoding: "utf8" },
  );
  rmSync(at, { recursive: true, force: true });
  return run;
};

describe("the planted red under the import cycle gate", () => {
  it("refuses a planted pair of modules importing each other, naming both imports", () => {
    const run = biomeOver("cycles");

    expect(run.status).toBe(1);
    expect(`${run.stdout}${run.stderr}`).toContain(
      "This import is part of a cycle",
    );
    expect(run.stdout).toContain("Found 2 errors");
  });

  it("accepts a planted pair that imports one way, so it is not refusing every import", () => {
    const run = biomeOver("no-cycle");

    expect(run.status).toBe(0);
    expect(`${run.stdout}${run.stderr}`).not.toContain("part of a cycle");
  });
});
