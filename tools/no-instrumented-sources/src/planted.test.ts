import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const ENTRY = "tools/no-instrumented-sources/src/index.ts";
const PLANTED = "tools/no-instrumented-sources/planted";

const REFUSED = [
  "mutant-switch.ts.txt",
  "coverage-call.ts.txt",
  "namespace.ts.txt",
  "unchecked.ts.txt",
];

const gate = (...paths: readonly string[]) =>
  spawnSync(process.execPath, [ENTRY, ...paths], { encoding: "utf8" });

describe("the planted red", () => {
  it.each(REFUSED)("refuses %s, which carries instrumentation", (file) => {
    const run = gate(`${PLANTED}/${file}`);

    expect(run.status).toBe(1);
    expect(run.stderr).toContain(`  ${PLANTED}/${file}`);
  });

  it("accepts the planted file that carries none, so it is not refusing everything", () => {
    const run = gate(`${PLANTED}/clean.ts.txt`);

    expect(run.status).toBe(0);
    expect(run.stderr).toBe("");
  });

  it("refuses a run handed nothing, which is how an empty file list arrives", () => {
    expect(gate().status).toBe(1);
  });
});
