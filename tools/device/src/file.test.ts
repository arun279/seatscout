import { describe, expect, it } from "vitest";
import { read } from "./file.ts";

describe("reading a Flashlight results file", () => {
  it("reads a file that is there", () => {
    expect(read("tools/device/package.json")).toContain('"@seatscout/device"');
  });

  it("reads a file that is not there as nothing", () => {
    expect(read("tools/device/never-written.json")).toBeNull();
  });
});
