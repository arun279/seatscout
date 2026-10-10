import { describe, expect, it } from "vitest";
import { lintedInApp, said } from "./planted.fixtures.ts";

const REFUSAL = "This reads the platform outside the design system";

const read = (named: string, within?: string) =>
  lintedInApp("platform-reads", named, within);

describe("the planted red under the platform read gate", () => {
  for (const [written, named] of [
    ["Platform.OS", "reads-os.tsx"],
    ["Platform.select", "selects.tsx"],
  ]) {
    it(`refuses ${written} in a screen`, () => {
      const run = read(named ?? "");

      expect(run.status).toBe(1);
      expect(said(run)).toContain(REFUSAL);
    });

    for (const within of ["design-system", "host"])
      it(`passes ${written} in ${within}, where the platform is read`, () => {
        const run = read(named ?? "", within);

        expect(run.status).toBe(0);
        expect(said(run)).not.toContain(REFUSAL);
      });
  }

  it("passes a screen that asks the design system, so it is not refusing every file", () => {
    const run = read("asks.tsx");

    expect(run.status).toBe(0);
    expect(said(run)).not.toContain(REFUSAL);
  });
});
