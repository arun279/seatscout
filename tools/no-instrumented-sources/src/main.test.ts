import { describe, expect, it } from "vitest";
import { MARKERS } from "./instrumentation.ts";
import { main, NOTHING, tracked } from "./main.ts";

const gate = (
  files: Readonly<Record<string, string>>,
  given: readonly string[] = [],
) => {
  const listed: string[] = [];
  const refused: string[] = [];
  const status = main(
    ["node", "instrumented", ...given],
    () => {
      listed.push("git ls-files");
      return `${Object.keys(files).join("\n")}\n`;
    },
    (path) => files[path] ?? "",
    {
      write: (text) => {
        refused.push(text);
      },
    },
  );
  return { status, listed, said: refused.join("") };
};

describe("reading a listing", () => {
  it("takes its paths and drops the empty line at its end", () => {
    expect(tracked("a.ts\nb.tsx\n")).toStrictEqual(["a.ts", "b.tsx"]);
  });

  it("reads an empty listing as no path at all", () => {
    expect(tracked("")).toStrictEqual([]);
  });
});

describe("the command line", () => {
  it("judges every tracked source when it is given no path", () => {
    const { status, listed, said } = gate({ "dirty.ts": MARKERS.join("\n") });

    expect(listed).toStrictEqual(["git ls-files"]);
    expect(status).toBe(1);
    expect(said).toContain("  dirty.ts");
  });

  it("judges the paths it is given, without listing the tree", () => {
    const { status, listed } = gate(
      { "clean.ts": "export {};", "dirty.ts": MARKERS.join("\n") },
      ["clean.ts"],
    );

    expect(listed).toStrictEqual([]);
    expect(status).toBe(0);
  });

  it("passes a tree carrying no instrumentation, and says nothing", () => {
    const { status, said } = gate({ "clean.ts": "export {};" });

    expect(status).toBe(0);
    expect(said).toBe("");
  });

  it("refuses a run with nothing to judge, rather than passing over nothing", () => {
    const { status, said } = gate({});

    expect(status).toBe(1);
    expect(said).toBe(NOTHING);
    expect(said).toContain("Refusing a run with no file to judge");
  });
});
