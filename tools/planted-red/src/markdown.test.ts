import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { overPlanted, ran, said } from "./planted.fixtures.ts";

const linted = (named: string) =>
  overPlanted("markdown", (at) => ran("markdownlint-cli2", join(at, named)));

describe("the planted red under the markdown gate", () => {
  for (const [written, named, rule] of [
    ["two top-level headings", "two-titles.md", "MD025/single-title"],
    [
      "a fence that names no language",
      "bare-fence.md",
      "MD040/fenced-code-language",
    ],
  ])
    it(`refuses ${written}`, () => {
      const run = linted(named ?? "");

      expect(run.status).toBe(1);
      expect(said(run)).toContain(rule);
    });

  it("passes a tidy record, long lines included, so it is not refusing every file", () => {
    const run = linted("tidy.md");

    expect(said(run)).toContain("Linting: 1 file");
    expect(run.status).toBe(0);
  });
});
