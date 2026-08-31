import { describe, expect, it } from "vitest";
import { list, read } from "./files.ts";

const PLANTED = "tools/live-injections/planted";

describe("reading the tree", () => {
  it("hands back what a file holds", async () => {
    expect(await read(`${PLANTED}/asks-for-what-is-there.live.txt`)).toBe(
      'const area = inject("liveArea");\n',
    );
  });

  it("lists every file a pattern matches", async () => {
    expect([...(await list(`${PLANTED}/*.live.txt`))].sort()).toStrictEqual([
      `${PLANTED}/asks-for-more.live.txt`,
      `${PLANTED}/asks-for-what-is-there.live.txt`,
    ]);
  });

  it("lists nothing for a pattern that matches nothing", async () => {
    expect(await list(`${PLANTED}/*.nothing`)).toStrictEqual([]);
  });
});
