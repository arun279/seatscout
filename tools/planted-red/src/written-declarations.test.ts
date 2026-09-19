import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { overPlanted, ran, said } from "./planted.fixtures.ts";

const compiledUnderTheBase = (named: string) =>
  overPlanted("declarations", (at) => {
    const run = ran(
      "tsc",
      "-p",
      join(at, `${named}.tsconfig.json`),
      "--pretty",
      "false",
    );
    return {
      status: run.status,
      said: said(run),
      emitted: existsSync(join(at, "dist", `${named}.d.ts`)),
    };
  });

describe("the planted red under the written declaration gate", () => {
  it("refuses an export whose type a declaration emitter cannot write down", () => {
    const run = compiledUnderTheBase("inferred");

    expect(run.status).toBe(1);
    expect(run.said).toContain(
      "error TS9007: Function must have an explicit return type annotation with --isolatedDeclarations.",
    );
    expect(run.emitted).toBe(false);
  });

  it("accepts the same export with its type written, and writes the declaration down", () => {
    const run = compiledUnderTheBase("written");

    expect(run.status).toBe(0);
    expect(run.emitted).toBe(true);
  });
});
