import { describe, expect, it } from "vitest";
import { read } from "./file.ts";

describe("reading a file", () => {
  it("hands back its text", () => {
    expect(read("tools/counts-in-prose/planted/structure.ts.txt")).toContain(
      "export interface PlantedSeat {",
    );
  });
});
