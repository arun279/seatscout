import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { overPlanted, ran, said } from "./planted.fixtures.ts";

const biomeOver = (named: string) =>
  overPlanted("classes", (at) =>
    ran(
      "biome",
      "lint",
      "--vcs-enabled=false",
      "--only=nursery/noUndeclaredClasses",
      join(at, named),
    ),
  );

describe("the planted red under the undeclared class gate", () => {
  it("refuses a class the imported stylesheet does not rule, naming the class", () => {
    const run = biomeOver("undeclared.tsx");

    expect(run.status).toBe(1);
    expect(said(run)).toContain(
      "The CSS class undeclared is not defined in any imported stylesheet.",
    );
    expect(run.stdout).toContain("Found 1 error");
  });

  it("accepts a class that stylesheet does rule, so it is not refusing every class", () => {
    const run = biomeOver("declared.tsx");

    expect(run.status).toBe(0);
    expect(run.stdout).toContain("Checked 1 file");
  });
});
