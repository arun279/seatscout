import { describe, expect, it } from "vitest";
import { reading } from "./structures.fixtures.ts";
import {
  alternativesOf,
  bodyOf,
  fieldsOf,
  translationsOf,
} from "./structures.ts";

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

  it("refuses a source that declares no such interface", () => {
    expect(() =>
      fieldsOf(reading("type Seat = string;"), "a.ts", "Seat"),
    ).toThrow("a.ts declares no interface Seat");
  });

  it("reads a field only where an interface writes one, at the one indent", () => {
    const source = `interface Seat {
  readonly row: string;
    readonly deep: string;
}`;

    expect(fieldsOf(reading(source), "a.ts", "Seat")).toStrictEqual(["row"]);
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

  it("refuses a source that declares no such type", () => {
    expect(() =>
      alternativesOf(reading("interface Gap { readonly a: 1 }"), "a.ts", "Gap"),
    ).toThrow("a.ts declares no type Gap");
  });

  it("reads a union of named types whole rather than letter by letter", () => {
    expect(
      alternativesOf(reading("type Gap = Narrow | Wide;"), "a.ts", "Gap"),
    ).toStrictEqual(["Narrow", "Wide"]);
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

    expect(translationsOf(reading(source), "a.ts", "CHAINS")).toStrictEqual([
      '  ["AMC", "AMC Theatres"],',
      '  ["RGL", "Regal"],',
    ]);
  });

  it("refuses an entry that does not end where an entry ends", () => {
    const source = `const CHAINS: ReadonlyMap<string, string> = new Map([
  ["AMC", "AMC Theatres"], // the operator's own brand
]);`;

    expect(() => translationsOf(reading(source), "a.ts", "CHAINS")).toThrow(
      "const CHAINS in a.ts holds an entry spelled in a way this check cannot read",
    );
  });

  it("reads no entry indented past where an entry starts", () => {
    const source = `const CHAINS: ReadonlyMap<string, string> = new Map([
    ["AMC", "AMC Theatres"],
]);`;

    expect(translationsOf(reading(source), "a.ts", "CHAINS")).toStrictEqual([]);
  });

  it("refuses a source that declares no such table", () => {
    expect(() =>
      translationsOf(reading("const OTHER = 1;"), "a.ts", "CHAINS"),
    ).toThrow("a.ts declares no const CHAINS");
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
