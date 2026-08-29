import { describe, expect, it } from "vitest";
import { missing, refusal, WEIGHED, weighed } from "./weighed.ts";

const report = (...statuses: readonly string[]) => ({
  files: {
    "a.ts": { mutants: statuses.map((status) => ({ status })) },
  },
});

describe("counting what a run weighed", () => {
  it("counts every status that lands in the score", () => {
    expect(weighed(report(...WEIGHED))).toBe(WEIGHED.length);
  });

  it("counts neither an ignored mutant nor one that would not compile", () => {
    expect(weighed(report("Ignored", "CompileError", "RuntimeError"))).toBe(0);
  });

  it("counts across every file the run judged", () => {
    expect(
      weighed({
        files: {
          "a.ts": { mutants: [{ status: "Killed" }] },
          "b.ts": { mutants: [{ status: "Survived" }] },
        },
      }),
    ).toBe(2);
  });

  it("counts nothing in a report that judged no file", () => {
    expect(weighed({ files: {} })).toBe(0);
  });

  it("counts nothing in a report holding no files at all", () => {
    expect(weighed({})).toBe(0);
  });

  it("counts nothing in a file holding no mutants at all", () => {
    expect(weighed({ files: { "a.ts": {} } })).toBe(0);
  });
});

describe("what the guard says", () => {
  it("names the report, why the run passed its own gate, and what counts", () => {
    expect(refusal("reports/mutation/mutation.json")).toBe(
      "reports/mutation/mutation.json records a run that weighed no mutant.\n\n" +
        "Stryker scores such a run as NaN and breaks on score < threshold, so it passes its\n" +
        "own gate. A mutation score is a verdict over the mutants it weighed, and there were\n" +
        "none: the mutate glob in stryker.config.json reaches no source, or every mutant was\n" +
        "ignored or failed to compile. Killed, Survived, NoCoverage, Timeout are the statuses that count.\n",
    );
  });

  it("says where the report should have been when there is none", () => {
    expect(missing("reports/mutation/mutation.json")).toContain(
      "does not exist, so the mutation run wrote no report",
    );
  });
});
