import { describe, expect, it } from "vitest";
import { MUTATION, WEIGHED } from "./mutation.ts";

const report = (...statuses: readonly string[]) =>
  JSON.stringify({
    files: { "a.ts": { mutants: statuses.map((status) => ({ status })) } },
  });

const weighed = (...statuses: readonly string[]) =>
  MUTATION.measure(report(...statuses)).weighed;

describe("counting what a mutation run weighed", () => {
  it("counts every status that lands in the score", () => {
    expect(weighed(...WEIGHED)).toBe(WEIGHED.length);
  });

  it("counts neither an ignored mutant nor one that would not compile", () => {
    expect(weighed("Ignored", "CompileError", "RuntimeError")).toBe(0);
    expect(weighed("Killed", "Ignored")).toBe(1);
  });

  it("counts across every file the run judged", () => {
    expect(
      MUTATION.measure(
        JSON.stringify({
          files: {
            "a.ts": { mutants: [{ status: "Killed" }] },
            "b.ts": { mutants: [{ status: "Survived" }] },
          },
        }),
      ).weighed,
    ).toBe(2);
  });

  it("counts nothing in a report that judged no file", () => {
    expect(MUTATION.measure(JSON.stringify({ files: {} })).weighed).toBe(0);
  });

  it("counts nothing in a file that holds no mutant", () => {
    expect(
      MUTATION.measure(JSON.stringify({ files: { "a.ts": { mutants: [] } } }))
        .weighed,
    ).toBe(0);
  });
});

describe("a mutant Stryker could not judge", () => {
  const erroredIn = (...mutants: readonly object[]) =>
    MUTATION.measure(JSON.stringify({ files: { "a.ts": { mutants } } }))
      .refused;

  it("refuses a run in which any mutant ended as a runtime or compile error, naming each one and its error", () => {
    expect(
      erroredIn(
        { status: "Killed" },
        {
          status: "RuntimeError",
          mutatorName: "ConditionalExpression",
          location: { start: { line: 279, column: 3 } },
          statusReason: "Test runner crashed.\nTried twice",
        },
        {
          status: "CompileError",
          mutatorName: "StringLiteral",
          location: { start: { line: 12, column: 9 } },
          statusReason: "TS2322",
        },
      ),
    ).toBe(
      "records 2 mutant(s) Stryker could not judge:\n" +
        "a.ts:279:3 ConditionalExpression RuntimeError: Test runner crashed.\n" +
        "a.ts:12:9 StringLiteral CompileError: TS2322\n\n" +
        "Stryker leaves a runtime or compile error out of the score, so a break of 100 passes it,\n" +
        "yet no test ever judged that mutant. Find why its run failed; the error is named above.\n",
    );
  });

  it("refuses nothing in a run whose every mutant was judged or ignored", () => {
    expect(
      erroredIn({ status: "Killed" }, { status: "Ignored" }),
    ).toBeUndefined();
  });
});

describe("what the mutation guard says", () => {
  it("names the report, why the run passed its own gate, and what counts", () => {
    expect(MUTATION.refusal("reports/mutation/core.json")).toBe(
      "reports/mutation/core.json records a run that weighed no mutant.\n\n" +
        "Stryker scores such a run as NaN and breaks on score < threshold, so it passes its\n" +
        "own gate. A mutation score is a verdict over the mutants it weighed, and there were\n" +
        "none: this shard's mutate glob in stryker.shards.json reaches no source, or every\n" +
        "mutant was ignored or failed to compile.\n" +
        "Killed, Survived, NoCoverage, Timeout are the statuses that count.\n",
    );
  });

  it("calls a shard that left no report a verdict rather than an omission", () => {
    expect(MUTATION.missing("reports/mutation/core.json")).toContain(
      "does not exist, so the shard that writes it judged nothing",
    );
  });
});
