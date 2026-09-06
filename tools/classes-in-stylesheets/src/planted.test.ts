import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ENTRY = resolve("tools/classes-in-stylesheets/src/index.ts");
const PLANTED = "tools/classes-in-stylesheets/planted";

const gate = (...args: readonly string[]) =>
  spawnSync(process.execPath, [ENTRY, `${PLANTED}/index.html`, ...args], {
    encoding: "utf8",
  });

describe("the planted red", () => {
  it("refuses every class planted without a rule, and only those", () => {
    const run = gate(`${PLANTED}/*.tsx.txt`);

    expect(run.status).toBe(1);
    expect(run.stderr).toBe(
      "Refusing 3 class(es) named in a className with no rule in any linked stylesheet:\n" +
        `  ${PLANTED}/offends.tsx.txt:2 .ghost\n` +
        `  ${PLANTED}/offends.tsx.txt:3 .faint\n` +
        `  ${PLANTED}/offends.tsx.txt:4 .spectre\n` +
        "\nA class the markup carries and no stylesheet rules draws nothing, so the surface goes\n" +
        "out unstyled where its board draws it. Add the rule to the stylesheet that owns the\n" +
        "surface, or take the class off the element. CONTRIBUTING.md says which owns what.\n",
    );
  });

  it("accepts the planted module whose every class is ruled, so it is not refusing everything", () => {
    const run = gate(`${PLANTED}/clean.tsx.txt`);

    expect(run.status).toBe(0);
    expect(run.stderr).toBe("");
  });

  it("refuses a pattern that matches no module", () => {
    expect(gate("no/such/*.tsx").status).toBe(1);
  });
});
