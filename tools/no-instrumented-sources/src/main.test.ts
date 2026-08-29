import { describe, expect, it } from "vitest";
import { MARKERS } from "./instrumentation.ts";
import { main, NOTHING } from "./main.ts";

const gate = (files: Readonly<Record<string, string>>) => {
  const refused: string[] = [];
  const status = main(
    ["node", "instrumented", ...Object.keys(files)],
    (path) => files[path] ?? "",
    {
      write: (text) => {
        refused.push(text);
      },
    },
  );
  return { status, said: refused.join("") };
};

describe("the command line", () => {
  it("passes a tree carrying no instrumentation, and says nothing", () => {
    const { status, said } = gate({ "clean.ts": "export {};" });

    expect(status).toBe(0);
    expect(said).toBe("");
  });

  it("fails and names the file when one carries instrumentation", () => {
    const { status, said } = gate({ "dirty.ts": MARKERS.join("\n") });

    expect(status).toBe(1);
    expect(said).toContain("  dirty.ts");
  });

  it("refuses a run handed no file at all, rather than passing over nothing", () => {
    const { status, said } = gate({});

    expect(status).toBe(1);
    expect(said).toBe(NOTHING);
  });
});
