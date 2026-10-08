import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { overPlanted, ran, said } from "./planted.fixtures.ts";

const REFUSAL = "This id is a literal";

const drawn = (named: string) =>
  overPlanted("ids", (at) =>
    ran("biome", "lint", "--vcs-enabled=false", join(at, named)),
  );

describe("the planted red under the literal id gate", () => {
  for (const [written, named] of [
    ["as a string", "written.tsx"],
    ["as a string in braces", "braced.tsx"],
    ["as a template with nothing in it", "template.tsx"],
  ])
    it(`refuses an id written ${written}`, () => {
      const run = drawn(named ?? "");

      expect(run.status).toBe(1);
      expect(said(run)).toContain(REFUSAL);
    });

  it("passes ids built from useId, alone, in a template or joined to a string, so it is not refusing every id", () => {
    const run = drawn("derived.tsx");

    expect(run.status).toBe(0);
    expect(said(run)).not.toContain(REFUSAL);
  });
});
