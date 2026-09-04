import { describe, expect, it } from "vitest";
import { read } from "./file.ts";

describe("reading a samples file", () => {
  it("reads a file that is there", () => {
    expect(read("tools/journey/planted/head-empty.json")).toBe("[]\n");
  });

  it("reads a file that is not there as nothing", () => {
    expect(read("tools/journey/planted/never-written.json")).toBeNull();
  });
});
