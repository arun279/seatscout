import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { blanked } from "./blank.js";
import { blankTree } from "./blank-tree.js";

const PLANTED = "tools/footprint/planted";

const planted = (name: string): string =>
  readFileSync(`${PLANTED}/${name}`, "utf8");

describe("blanking what a script writes as text, so cloc reads only real comments", () => {
  it("blanks strings, templates, globs and regular expressions that hold comment markers, and leaves every comment and line in place", () => {
    expect(
      blanked("planted.ts", planted("strings-holding-comment-markers.ts.txt")),
    ).toBe(planted("strings-holding-comment-markers.blanked.ts.txt"));
  });

  it("blanks the text inside JSX, where an address reads as a line comment", () => {
    expect(
      blanked("a.tsx", "const a = <p>see https://x.dev /* not */</p>;\n"),
    ).toBe("const a = <p>xxxxxxxxxxxxxxxxxxxxxxxxxxx</p>;\n");
  });

  it("keeps its place after characters outside the basic plane", () => {
    expect(blanked("a.ts", 'const a = "𝄞·";\n/* one */\n')).toBe(
      'const a = "xxx";\n/* one */\n',
    );
  });

  it("refuses a file it cannot parse, rather than counting it as it stands", () => {
    expect(() => blanked("a.ts", "const = ;")).toThrow("a.ts does not parse");
  });
});

describe("blanking a copy of a commit", () => {
  it("blanks every script under it and leaves every other file as it was", () => {
    const at = mkdtempSync(join(tmpdir(), "blank-"));
    try {
      writeFileSync(join(at, "a.ts"), 'const a = "/*";\n');
      writeFileSync(join(at, "a.md"), 'const a = "/*";\n');

      expect(blankTree(at)).toBe(1);
      expect(readFileSync(join(at, "a.ts"), "utf8")).toBe('const a = "xx";\n');
      expect(readFileSync(join(at, "a.md"), "utf8")).toBe('const a = "/*";\n');
    } finally {
      rmSync(at, { recursive: true, force: true });
    }
  });
});
