import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { overPlanted, ran, said } from "./planted.fixtures.ts";

const REFUSAL = "This is a colour, so it is a token.";

const drawn = (named: string) =>
  overPlanted("colours", (at) =>
    ran("biome", "lint", "--vcs-enabled=false", join(at, named)),
  );

describe("the planted red under the colour literal gate", () => {
  for (const [notation, named] of [
    ["a hex colour", "hex.tsx"],
    ["a colour function", "functional.tsx"],
    ["a CSS named colour", "named.tsx"],
  ])
    it(`refuses ${notation} written into a screen`, () => {
      const run = drawn(named ?? "");

      expect(run.status).toBe(1);
      expect(said(run)).toContain(REFUSAL);
    });

  it("passes a token read by its name, so it is not refusing every word", () => {
    const run = drawn("token.tsx");

    expect(run.status).toBe(0);
    expect(said(run)).not.toContain(REFUSAL);
  });
});
