import { describe, expect, it } from "vitest";
import { git } from "./run.ts";

describe("running git", () => {
  it("hands back what git printed", () => {
    expect(git(["--version"])).toMatch(/^git version /);
  });
});
