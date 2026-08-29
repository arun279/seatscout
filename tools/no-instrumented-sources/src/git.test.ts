import { describe, expect, it } from "vitest";
import { listing, SOURCES } from "./git.ts";

describe("listing the tracked sources", () => {
  it("lists every suffix TypeScript is written under", () => {
    expect(SOURCES).toStrictEqual(["*.ts", "*.tsx", "*.mts", "*.cts"]);
  });

  it("lists the TypeScript this repository tracks", () => {
    const listed = listing().split("\n");

    expect(listed).toContain("tools/no-instrumented-sources/src/main.ts");
    expect(listed).toContain("apps/native/src/app.tsx");
  });

  it("lists no file the suffixes it asks for cannot match", () => {
    expect(listing()).not.toContain("package.json");
  });
});
