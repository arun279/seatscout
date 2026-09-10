import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DUPLICATION } from "./duplication.ts";
import { main } from "./main.ts";
import { MUTATION } from "./mutation.ts";

const guard = (...argv: readonly string[]) => {
  const printed: string[] = [];
  const refused: string[] = [];
  const reports: Record<string, string> = {
    [MUTATION.report]: JSON.stringify({
      files: { "a.ts": { mutants: [{ status: "Killed" }] } },
    }),
    [DUPLICATION.report]: JSON.stringify({
      statistics: {
        total: { sources: 2, lines: 20, duplicatedLines: 0, percentage: 0 },
      },
    }),
    "elsewhere.json": JSON.stringify({
      files: { "a.ts": { mutants: [{ status: "Survived" }] } },
    }),
    "weighed-nothing.json": JSON.stringify({
      files: { "a.ts": { mutants: [{ status: "Ignored" }] } },
    }),
  };
  const status = main(
    ["node", "no-empty-run", ...argv],
    (path) => reports[path] ?? null,
    {
      write: (text) => {
        printed.push(text);
      },
    },
    {
      write: (text) => {
        refused.push(text);
      },
    },
  );
  return { status, said: printed.join(""), refused: refused.join("") };
};

describe("the guard", () => {
  it("defaults to the report stryker.config.json names its json reporter", () => {
    const { jsonReporter } = JSON.parse(
      readFileSync("stryker.config.json", "utf8"),
    );

    expect(MUTATION.report).toBe(jsonReporter.fileName);
  });

  it("defaults to the report jscpd writes into the directory .jscpd.json names", () => {
    const { output } = JSON.parse(readFileSync(".jscpd.json", "utf8"));

    expect(DUPLICATION.report).toBe(`${output}/jscpd-report.json`);
  });

  it("reads the report each run writes when it is told no path", () => {
    expect(guard("mutation").status).toBe(0);
    expect(guard("duplication").status).toBe(0);
  });

  it("reads whatever report it is given", () => {
    expect(guard("mutation", "elsewhere.json").status).toBe(0);
  });

  it("passes a mutation run that weighed a mutant, and says how many", () => {
    const { status, said } = guard("mutation");

    expect(status).toBe(0);
    expect(said).toBe(
      `${MUTATION.report} records a run that weighed 1 mutants.\n`,
    );
  });

  it("passes a duplication run that read a source, and says what it measured", () => {
    const { status, said } = guard("duplication");

    expect(status).toBe(0);
    expect(said).toBe(
      `${DUPLICATION.report} records 0 duplicated line(s) of 20 across 2 source(s), 0.00%.\n`,
    );
  });

  it("fails a mutation run that weighed none, which Stryker scores as NaN and passes", () => {
    const { status, refused } = guard("mutation", "weighed-nothing.json");

    expect(status).toBe(1);
    expect(refused).toContain("records a run that weighed no mutant");
  });

  it("fails when the run wrote no report at all", () => {
    const { status, refused } = guard("mutation", "never-written.json");

    expect(status).toBe(1);
    expect(refused).toContain("does not exist");
  });

  it("fails when it is asked for a run it does not read", () => {
    const { status, refused } = guard("coverage");

    expect(status).toBe(1);
    expect(refused).toBe(
      "coverage is not a run this guard reads. Name one of: duplication, mutation.\n",
    );
  });

  it("fails when it is asked for nothing at all", () => {
    expect(guard().refused).toContain("nothing is not a run this guard reads");
  });
});
