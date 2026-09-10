import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ENTRY = "tools/no-empty-run/src/index.ts";
const PLANTED = "tools/no-empty-run/planted";

const guard = (kind: string, report: string) =>
  spawnSync(process.execPath, [ENTRY, kind, `${PLANTED}/${kind}/${report}`], {
    encoding: "utf8",
  });

const jscpdOver = (fixture: string) => {
  const at = mkdtempSync(join(tmpdir(), "duplication-"));
  const source = join(at, "source");
  const written = join(at, "report");
  mkdirSync(source, { recursive: true });
  for (const named of readdirSync(`${PLANTED}/duplication/${fixture}`))
    copyFileSync(
      `${PLANTED}/duplication/${fixture}/${named}`,
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

describe("the planted red under the duplication gate", () => {
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
    const run = guard("duplication", "measured-nothing.json");

    expect(run.status).toBe(1);
    expect(run.stderr).toContain("records a run that read no source");
  });

  it("accepts a report of a run that read two sources, so it is not refusing everything", () => {
    const run = guard("duplication", "measured-two.json");

    expect(run.status).toBe(0);
    expect(run.stdout).toContain("across 2 source(s)");
  });
});

describe("the planted red under the mutation gate", () => {
  it("refuses a report whose every mutant was ignored or would not compile", () => {
    const run = guard("mutation", "weighed-nothing.json");

    expect(run.status).toBe(1);
    expect(run.stderr).toContain("records a run that weighed no mutant");
  });

  it("refuses a report that judged no file", () => {
    expect(guard("mutation", "no-file-at-all.json").status).toBe(1);
  });

  it("accepts a report that weighed one mutant, so it is not refusing everything", () => {
    const run = guard("mutation", "weighed-one.json");

    expect(run.status).toBe(0);
    expect(run.stdout).toContain("weighed 1 mutants");
  });
});

describe("the planted red under either", () => {
  it("refuses a report the run never wrote", () => {
    expect(guard("mutation", "never-written.json").status).toBe(1);
    expect(guard("duplication", "never-written.json").status).toBe(1);
  });
});
