import { describe, expect, it } from "vitest";
import {
  alternativesOf,
  bodyOf,
  fieldsOf,
  translationsOf,
} from "./structures.ts";

const reading = (source: string) => (path: string) => {
  if (path !== "a.ts") throw new Error(`no such file: ${path}`);
  return source;
};

describe("reading a declaration out of a source", () => {
  it("hands back what the pattern captured", () => {
    expect(
      bodyOf(reading("const A = 1;"), "a.ts", "const A", /const A = (\d);/),
    ).toBe("1");
  });

  it("refuses a source the pattern does not match, naming what it looked for", () => {
    expect(() =>
      bodyOf(reading("const B = 1;"), "a.ts", "const A", /const A = (\d);/),
    ).toThrow("a.ts declares no const A");
  });
});

describe("counting the fields of an interface", () => {
  it("reads a readonly field, an optional one and a plain one", () => {
    const source = `interface Seat {
  readonly row: string;
  number?: number;
  status: string;
}`;

    expect(fieldsOf(reading(source), "a.ts", "Seat")).toStrictEqual([
      "row",
      "number",
      "status",
    ]);
  });

  it("refuses an interface holding a member it cannot read", () => {
    const source = `interface Seat {
  readonly row: string;
  [key: string]: unknown;
}`;

    expect(() => fieldsOf(reading(source), "a.ts", "Seat")).toThrow(
      "interface Seat in a.ts declares a member spelled in a way this check cannot read",
    );
  });

  it("reads only the interface it was asked for", () => {
    const source = `interface Row {
  readonly label: string;
}

interface Seat {
  readonly row: string;
  readonly number: number;
}`;

    expect(fieldsOf(reading(source), "a.ts", "Seat")).toStrictEqual([
      "row",
      "number",
    ]);
  });
});

describe("counting the alternatives of a union", () => {
  it("reads every literal in it", () => {
    expect(
      alternativesOf(
        reading('type Gap = "narrow" | "wide" | "aisle";'),
        "a.ts",
        "Gap",
      ),
    ).toStrictEqual(['"narrow"', '"wide"', '"aisle"']);
  });

  it("refuses a type that has stopped being a union of literals", () => {
    expect(() =>
      alternativesOf(
        reading("type Gap = { readonly width: number };"),
        "a.ts",
        "Gap",
      ),
    ).toThrow(
      "type Gap in a.ts is no longer a union of literals this check can count",
    );
  });
});

describe("counting the entries of a translation table", () => {
  it("reads every pair in it", () => {
    const source = `const CHAINS: ReadonlyMap<string, string> = new Map([
  ["AMC", "AMC Theatres"],
  ["RGL", "Regal"],
]);`;

    expect(translationsOf(reading(source), "a.ts", "CHAINS")).toHaveLength(2);
  });

  it("refuses a table holding an entry it cannot read", () => {
    const source = `const CHAINS: ReadonlyMap<string, string> = new Map([
  ["AMC", "AMC Theatres"],
  [code, name],
]);`;

    expect(() => translationsOf(reading(source), "a.ts", "CHAINS")).toThrow(
      "const CHAINS in a.ts holds an entry spelled in a way this check cannot read",
    );
  });
});
