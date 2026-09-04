import { describe, expect, it } from "vitest";
import { reading } from "./structures.fixtures.ts";
import {
  deniedGlobalsOf,
  fieldAlternativesOf,
  succeedingArmsOf,
  weightsOf,
} from "./structures.ts";

describe("counting the alternatives of a field inside an interface", () => {
  const source = `interface Divergence {
  readonly kind: "body" | "shape" | "status";
  readonly at: string;
}`;

  it("reads every literal the field's type offers", () => {
    expect(
      fieldAlternativesOf(reading(source), "a.ts", "Divergence", "kind"),
    ).toStrictEqual(['"body"', '"shape"', '"status"']);
  });

  it("refuses an interface whose field is not the one it was told", () => {
    expect(() =>
      fieldAlternativesOf(reading(source), "a.ts", "Divergence", "why"),
    ).toThrow("a.ts declares no the why of an Divergence");
  });
});

describe("counting the weights of an object literal", () => {
  const source = `const REFERENCE: SeatProfile = {
  centreWeight: 1,
  depthWeight: 0.5,
  lateralWeight: 0.25,
  targetDepth: 0.6,
};`;

  it("reads every weight and nothing else", () => {
    expect(weightsOf(reading(source), "a.ts", "REFERENCE")).toStrictEqual([
      1, 0.5, 0.25,
    ]);
  });

  it("reads no weight from a line that only looks like one", () => {
    const indented = `const REFERENCE: SeatProfile = {
  centreWeight: 1,
    depthWeight: 0.5,
};`;

    expect(weightsOf(reading(indented), "a.ts", "REFERENCE")).toStrictEqual([
      1,
    ]);
  });

  it("reads no weight from a line that does not end where it should", () => {
    const trailing = `const REFERENCE: SeatProfile = {
  centreWeight: 1, // and more
};`;

    expect(weightsOf(reading(trailing), "a.ts", "REFERENCE")).toStrictEqual([]);
  });

  it("refuses a weight that is not a number", () => {
    const spelled = `const REFERENCE: SeatProfile = {
  centreWeight: HEAVIEST,
};`;

    expect(() => weightsOf(reading(spelled), "a.ts", "REFERENCE")).toThrow(
      'REFERENCE in a.ts weights something by "HEAVIEST"',
    );
  });

  it("refuses a source that declares no such literal", () => {
    expect(() =>
      weightsOf(reading("const OTHER = 1;"), "a.ts", "REFERENCE"),
    ).toThrow("a.ts declares no const REFERENCE");
  });
});

describe("counting the arms of a union that succeed", () => {
  it("counts one for each arm declaring it succeeded", () => {
    const source = `type Verified =
  | {
      readonly ok: true;
      readonly url: string;
    }
  | {
      readonly ok: true;
      readonly url: string;
      readonly seats: number;
    }
  | { readonly ok: false };`;

    expect(succeedingArmsOf(reading(source), "a.ts")).toBe(2);
  });

  it("counts no arm indented differently, and none with anything after it", () => {
    const source = `    readonly ok: true;
      readonly ok: true; // and more
        readonly ok: true;`;

    expect(succeedingArmsOf(reading(source), "a.ts")).toBe(0);
  });
});

describe("counting the globals a linter denies under a tree", () => {
  const config = JSON.stringify({
    overrides: [
      { includes: ["apps/**"], linter: { rules: { style: {} } } },
      { includes: ["packages/**"] },
      { includes: ["packages/**"], linter: {} },
      { includes: ["packages/**"], linter: { rules: {} } },
      { includes: ["packages/**"], linter: { rules: { style: {} } } },
      {
        includes: ["packages/**"],
        linter: {
          rules: {
            style: {
              noRestrictedGlobals: {
                options: { deniedGlobals: { caches: "no", window: "no" } },
              },
            },
          },
        },
      },
    ],
  });

  it("reads the denied names out of the override for that tree", () => {
    expect(
      deniedGlobalsOf(reading(config, "a.json"), "a.json", "packages"),
    ).toStrictEqual(["caches", "window"]);
  });

  it("refuses a configuration whose override denies no global", () => {
    expect(() =>
      deniedGlobalsOf(reading(config, "a.json"), "a.json", "apps"),
    ).toThrow("a.json denies no global under apps");
  });

  it("refuses a configuration with no override for that tree at all", () => {
    expect(() =>
      deniedGlobalsOf(reading(config, "a.json"), "a.json", "tools"),
    ).toThrow("a.json denies no global under tools");
  });

  it("refuses an override that names no tree", () => {
    const nameless = JSON.stringify({
      overrides: [
        {
          linter: {
            rules: {
              style: {
                noRestrictedGlobals: {
                  options: { deniedGlobals: { a: "no" } },
                },
              },
            },
          },
        },
      ],
    });

    expect(() =>
      deniedGlobalsOf(reading(nameless, "a.json"), "a.json", "packages"),
    ).toThrow("a.json denies no global under packages");
  });

  it("takes an override that names the tree beside another, not only alone", () => {
    const paired = JSON.stringify({
      overrides: [
        {
          includes: ["apps/**", "packages/**"],
          linter: {
            rules: {
              style: {
                noRestrictedGlobals: {
                  options: { deniedGlobals: { a: "no" } },
                },
              },
            },
          },
        },
      ],
    });

    expect(
      deniedGlobalsOf(reading(paired, "a.json"), "a.json", "packages"),
    ).toStrictEqual(["a"]);
  });

  it("does not take an override for a tree whose name only starts the same", () => {
    const near = JSON.stringify({
      overrides: [
        {
          includes: ["packages-old/**"],
          linter: {
            rules: {
              style: {
                noRestrictedGlobals: {
                  options: { deniedGlobals: { a: "no" } },
                },
              },
            },
          },
        },
      ],
    });

    expect(() =>
      deniedGlobalsOf(reading(near, "a.json"), "a.json", "packages"),
    ).toThrow("a.json denies no global under packages");
  });
});
