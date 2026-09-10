import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ENTRY = "tools/no-empty-duplication-run/src/index.ts";
const PLANTED = "tools/no-empty-duplication-run/planted";

const guard = (report: string) =>
  spawnSync(process.execPath, [ENTRY, `${PLANTED}/${report}`], {
    encoding: "utf8",
  });

const jscpdOver = (fixture: string) => {
  const at = mkdtempSync(join(tmpdir(), "duplication-"));
  const source = join(at, "source");
  const written = join(at, "report");
  spawnSync("mkdir", ["-p", source]);
  for (const named of readdirSync(`${PLANTED}/${fixture}`))
    copyFileSync(
      `${PLANTED}/${fixture}/${named}`,
      join(source, named.replace(/\.txt$/, "")),
    );
  const run = spawnSync(
    "pnpm",
    ["exec", "jscpd", "--config", ".jscpd.json", "--output", written, source],
    { encoding: "utf8" },
  );
  rmSync(at, { recursive: true, force: true });
  return run;
};

describe("the planted red", () => {
  it("refuses the planted pair whose duplication is over the threshold the Sonar way sets", () => {
    const run = jscpdOver("duplicated");

    expect(run.status).toBe(1);
    expect(`${run.stdout}${run.stderr}`).toContain("over threshold (3.0%)");
  });

  it("accepts the planted pair that shares nothing, so it is not refusing everything", () => {
    const run = jscpdOver("clean");

    expect(run.status).toBe(0);
    expect(run.stdout).toContain("No duplicates found");
  });

  it("refuses a report of a run that read no source, which jscpd exits zero on", () => {
    const run = guard("measured-nothing.json");

    expect(run.status).toBe(1);
    expect(run.stderr).toContain("records a run that read no source");
  });

  it("refuses a report the run never wrote", () => {
    expect(guard("never-written.json").status).toBe(1);
  });

  it("accepts a report of a run that read two sources, so it is not refusing everything", () => {
    const run = guard("measured-two.json");

    expect(run.status).toBe(0);
    expect(run.stdout).toContain("across 2 source(s)");
  });
});
