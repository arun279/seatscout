import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { blanked } from "./blank.js";
import { blankAll } from "./blank-tree.js";

const PLANTED = "tools/footprint/planted";

const planted = (name: string): string =>
  readFileSync(`${PLANTED}/${name}`, "utf8");

describe("blanking what a script writes as text, so cloc reads only real comments", () => {
  it("blanks strings, templates, globs and regular expressions that hold comment markers, and leaves every comment and line in place", () => {
    expect(
      blanked("planted.ts", planted("strings-holding-comment-markers.ts.txt")),
    ).toBe(planted("strings-holding-comment-markers.blanked.ts.txt"));
  });

  it("blanks a string inside its quotes", () => {
    expect(blanked("a.ts", 'const a = "/*";\n')).toBe('const a = "xx";\n');
  });

  it("blanks a template, delimiters and all, and leaves what it interpolates", () => {
    expect(blanked("a.ts", "const a = `/*${ b }*/`;\n")).toBe(
      "const a = xxxxx b xxxx;\n",
    );
  });

  it("blanks a regular expression inside its slashes", () => {
    expect(blanked("a.ts", "const a = /\\/\\*/;\n")).toBe(
      "const a = /xxxx/;\n",
    );
  });

  it("blanks the text inside JSX, where an address reads as a line comment", () => {
    expect(
      blanked("a.tsx", "const a = <p>see https://x.dev /* not */</p>;\n"),
    ).toBe("const a = <p>xxxxxxxxxxxxxxxxxxxxxxxxxxx</p>;\n");
  });

  it("leaves numbers, booleans, null and every name as they are", () => {
    const source =
      "const a = 1234 + 0x1f;\nconst b = true && null;\nexport { a, b };\n";

    expect(blanked("a.ts", source)).toBe(source);
  });

  it("keeps every line ending inside what it blanks, carriage returns included", () => {
    expect(blanked("a.ts", "const a = `x\r\ny`;\r\n")).toBe(
      "const a = xx\r\nxx;\r\n",
    );
  });

  it("keeps its place after characters outside the basic plane", () => {
    expect(blanked("a.ts", 'const a = "𝄞·";\n/* one */\n')).toBe(
      'const a = "xxx";\n/* one */\n',
    );
  });

  it("refuses a file it cannot parse, naming it, rather than counting it as it stands", () => {
    expect(() => blanked("a.ts", "const = ;")).toThrow("a.ts does not parse");
  });
});

describe("blanking a copy of a commit", () => {
  const said: string[] = [];
  const err = { write: (text: string) => said.push(text) };

  const inCopy = (files: Readonly<Record<string, string>>) => {
    const at = mkdtempSync(join(tmpdir(), "blank-"));
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(join(at, path, ".."), { recursive: true });
      writeFileSync(join(at, path), text);
    }
    return at;
  };

  it("blanks every script at any depth and leaves every other file as it was", () => {
    const at = inCopy({
      "a.md": 'const a = "/*";\n',
      "src/deep/a.ts": 'const a = "/*";\n',
    });
    try {
      expect(blankAll(["node", "blank-index", at], err)).toBe(0);
      expect(readFileSync(join(at, "src/deep/a.ts"), "utf8")).toBe(
        'const a = "xx";\n',
      );
      expect(readFileSync(join(at, "a.md"), "utf8")).toBe('const a = "/*";\n');
    } finally {
      rmSync(at, { recursive: true, force: true });
    }
  });

  it("refuses a copy that holds no script, which would count nothing", () => {
    const at = inCopy({ "a.md": "# A record\n" });
    try {
      expect(blankAll(["node", "blank-index", at], err)).toBe(1);
      expect(said.at(-1)).toBe(`${at} holds no script to blank\n`);
    } finally {
      rmSync(at, { recursive: true, force: true });
    }
  });

  it("refuses to run without a directory to blank", () => {
    expect(blankAll(["node", "blank-index"], err)).toBe(2);
    expect(said.at(-1)).toBe("usage: blank-index <directory>\n");
  });
});
