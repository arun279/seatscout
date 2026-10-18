import { describe, expect, it } from "vitest";
import { judgedFrom } from "./results.ts";

const REPORT = '{"files":{}}';

const over = (files: Readonly<Record<string, string>>) => {
  const read = (path: string) => files[path] ?? null;
  const list = (dir: string) =>
    Object.keys(files)
      .filter((path) => path.startsWith(`${dir}/`))
      .map((path) => path.slice(dir.length + 1));
  return judgedFrom("results", read, list);
};

describe("reading what the mutation jobs left", () => {
  it("pairs each planned job with the outcome and the Stryker report its artifact holds, by its place in the plan", () => {
    expect(
      over({
        "results/plan.json": '[{"shard":"core"},{"shard":"native-ask"}]',
        "results/mutation-0/outcome": "success\n",
        "results/mutation-0/core.json": REPORT,
        "results/mutation-1/outcome": "failure\n",
      }),
    ).toEqual([
      { shard: "core", outcome: "success", reports: [REPORT] },
      { shard: "native-ask", outcome: "failure", reports: [] },
    ]);
  });

  it("gives a planned job whose artifact never arrived no outcome", () => {
    expect(over({ "results/plan.json": '[{"shard":"core"}]' })).toEqual([
      { shard: "core", outcome: undefined, reports: [] },
    ]);
  });

  it("reads an empty plan as a merge with nothing to mutate", () => {
    expect(over({ "results/plan.json": "[]" })).toEqual([]);
  });

  it.each([
    ["missing", {}],
    ["empty, as when the plan step failed", { "results/plan.json": "" }],
    ["not a list of jobs", { "results/plan.json": '{"shard":"core"}' }],
  ])("reads no plan when the plan file is %s", (_, files) => {
    expect(over(files)).toBeUndefined();
  });
});
