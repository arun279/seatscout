import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { biomeOver, overPlanted, said } from "./planted.fixtures.ts";

const RULE = "complexity/noExcessiveCognitiveComplexity";

const graded = (named: string) =>
  overPlanted("cognitive", (at) => biomeOver(RULE, join(at, named)));

describe("the planted red under the cognitive complexity gate", () => {
  it("refuses a planted function one branch over the limit, by score and by limit", () => {
    const run = graded("over.ts");

    expect(run.status).toBe(1);
    expect(said(run)).toContain(
      "Excessive complexity of 16 detected (max: 15).",
    );
    expect(run.stdout).toContain("Found 1 error");
  });

  it("accepts the same function one branch under it, so it is not refusing every branch", () => {
    const run = graded("under.ts");

    expect(run.status).toBe(0);
    expect(run.stdout).toContain("Checked 1 file");
  });
});
