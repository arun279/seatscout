import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const ENTRY = "tools/no-empty-mutation-run/src/index.ts";
const PLANTED = "tools/no-empty-mutation-run/planted";

const guard = (report: string) =>
  spawnSync(process.execPath, [ENTRY, `${PLANTED}/${report}`], {
    encoding: "utf8",
  });

describe("the planted red", () => {
  it("refuses a report whose every mutant was ignored or would not compile", () => {
    const run = guard("weighed-nothing.json");

    expect(run.status).toBe(1);
    expect(run.stderr).toContain("records a run that weighed no mutant");
  });

  it("refuses a report that judged no file", () => {
    expect(guard("no-file-at-all.json").status).toBe(1);
  });

  it("refuses a report the run never wrote", () => {
    expect(guard("never-written.json").status).toBe(1);
  });

  it("accepts a report that weighed one mutant, so it is not refusing everything", () => {
    const run = guard("weighed-one.json");

    expect(run.status).toBe(0);
    expect(run.stdout).toContain("weighed 1 mutants");
  });
});
