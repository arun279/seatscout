import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { overPlanted, ran } from "./planted.fixtures.ts";

const oxlintOver = (named: string) =>
  overPlanted("cyclomatic", (at) => {
    const run = ran("oxlint", "--format=json", join(at, named));
    const read = JSON.parse(run.stdout);
    return {
      status: run.status,
      files: read.number_of_files,
      found: read.diagnostics.map(
        (diagnostic: { code: string; message: string }) =>
          `${diagnostic.code}: ${diagnostic.message}`,
      ),
    };
  });

describe("the planted red under the cyclomatic complexity gate", () => {
  it("refuses a planted function one branch over the limit, by score and by limit", () => {
    const run = oxlintOver("over.ts");

    expect(run.status).toBe(1);
    expect(run.found).toStrictEqual([
      "eslint(complexity): function has a complexity of 11. Maximum allowed is 10.",
    ]);
  });

  it("accepts the same function one branch under it, and says it read the file", () => {
    const run = oxlintOver("under.ts");

    expect(run.status).toBe(0);
    expect(run.found).toStrictEqual([]);
    expect(run.files).toBe(1);
  });

  it("charges a planted switch every case, which only the classic variant does", () => {
    const run = oxlintOver("switch-over.ts");

    expect(run.status).toBe(1);
    expect(run.found).toStrictEqual([
      "eslint(complexity): function has a complexity of 12. Maximum allowed is 10.",
    ]);
  });

  it("accepts the same switch with nine cases, so it is the count of cases it charges", () => {
    const run = oxlintOver("switch-under.ts");

    expect(run.status).toBe(0);
    expect(run.found).toStrictEqual([]);
    expect(run.files).toBe(1);
  });
});
