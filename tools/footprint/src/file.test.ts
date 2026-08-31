import { describe, expect, it } from "vitest";
import { read } from "./file.js";

describe("reading a file", () => {
  it("hands back its text", () => {
    expect(read(".footprint.json")).toContain('"comments"');
  });
});
