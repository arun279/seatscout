import { describe, expect, it } from "vitest";
import { listing, staged } from "./git.ts";

const PLANTED = "tools/no-cache-storage-reach/planted";

describe("reading the index", () => {
  it("lists the tracked files under a pathspec", () => {
    expect(listing(PLANTED).split("\n")).toContain(`${PLANTED}/clean.ts.txt`);
  });

  it("lists nothing for a pathspec that matches no tracked file", () => {
    expect(listing("no/such/directory")).toBe("");
  });

  it("hands back what the index holds for a path", () => {
    expect(staged(`${PLANTED}/clean.ts.txt`)).toBe(
      "export const store = (): Storage => localStorage;\n",
    );
  });
});
