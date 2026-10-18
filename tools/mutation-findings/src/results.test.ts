import { describe, expect, it } from "vitest";
import { judgedFrom } from "./results.ts";

const REPORT = '{"files":{}}';

const reader =
  (files: Readonly<Record<string, string>>) =>
  (path: string): string | null =>
    files[path] ?? null;

const over = (files: Readonly<Record<string, string>>) =>
  judgedFrom("results", reader(files));

describe("reading what the mutation jobs left", () => {
  it("pairs each planned job, by its place in the plan, with its outcome and the report named after its shard", () => {
    expect(
      over({
        "results/plan.json": '[{"shard":"core"},{"shard":"native-ask"}]',
        "results/mutation-0/outcome": "success\n",
        "results/mutation-0/core.json": REPORT,
        "results/mutation-1/outcome": "failure\n",
        "results/mutation-1/core.json": REPORT,
      }),
    ).toEqual([
      { shard: "core", outcome: "success", report: REPORT },
      { shard: "native-ask", outcome: "failure", report: null },
    ]);
  });

  it("gives a planned job whose artifact never arrived neither an outcome nor a report", () => {
    expect(over({ "results/plan.json": '[{"shard":"core"}]' })).toEqual([
      { shard: "core", outcome: undefined, report: null },
    ]);
  });

  it("reads an empty plan as a merge with nothing to mutate", () => {
    expect(over({ "results/plan.json": "[]" })).toEqual([]);
  });

  it.each([
    ["missing", {}],
    ["empty, as when the plan step failed", { "results/plan.json": "" }],
  ])("reads no plan when the plan file is %s", (_, files) => {
    expect(over(files)).toBeUndefined();
  });

  it("reads no plan when no directory is named", () => {
    expect(
      judgedFrom(
        undefined,
        reader({ "undefined/plan.json": '[{"shard":"core"}]' }),
      ),
    ).toBeUndefined();
  });
});
