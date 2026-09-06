import { describe, expect, it } from "vitest";
import { list, read } from "./files.ts";

const PLANTED = "tools/classes-in-stylesheets/planted";

describe("reading the tree", () => {
  it("hands back what a file holds", async () => {
    expect(await read(`${PLANTED}/ruled.css`)).toBe(
      ".card {\n  display: flex;\n}\n\n.card .said {\n  color: red;\n}\n",
    );
  });

  it("lists every file a pattern matches", async () => {
    expect([...(await list(`${PLANTED}/*.tsx.txt`))].sort()).toStrictEqual([
      `${PLANTED}/clean.tsx.txt`,
      `${PLANTED}/offends.tsx.txt`,
    ]);
  });

  it("lists nothing for a pattern that matches nothing", async () => {
    expect(await list(`${PLANTED}/*.nothing`)).toStrictEqual([]);
  });
});
