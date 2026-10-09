import { describe, expect, it } from "vitest";
import { lintedInApp, said } from "./planted.fixtures.ts";

const REFUSAL = "Draw words through Type and fields through Field";

const drawn = (named: string) => lintedInApp("text-size", named);

describe("the planted red under the rule that every word follows the text size", () => {
  for (const [written, named] of [
    ["Text", "drawn.tsx"],
    ["TextInput", "field.tsx"],
    ["Text under another name", "renamed.tsx"],
  ])
    it(`refuses ${written} imported from React Native outside Type and Field`, () => {
      const run = drawn(named ?? "");

      expect(run.status).toBe(1);
      expect(said(run)).toContain(REFUSAL);
    });

  for (const [written, named] of [
    ["a whole import of types", "typed.tsx"],
    ["a type beside a value", "through-type.tsx"],
  ])
    it(`passes Text and TextInput named only as types, in ${written}`, () => {
      const run = drawn(named ?? "");

      expect(run.status).toBe(0);
      expect(said(run)).not.toContain(REFUSAL);
    });
});
