import { describe, expect, it } from "vitest";
import { read } from "./file.ts";

describe("reading a file", () => {
  it("hands back its text", () => {
    expect(read("tools/no-instrumented-sources/planted/clean.ts.txt")).toBe(
      "export const total = (a: number, b: number): number => a + b;\n",
    );
  });
});
