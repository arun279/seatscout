import { describe, expect, it } from "vitest";
import { APPS, main, NOTHING } from "./main.ts";

const gate = (
  files: Readonly<Record<string, string>>,
  ...argv: readonly string[]
) => {
  const asked: string[][] = [];
  const refused: string[] = [];
  const status = main(
    ["node", "cache-storage", ...argv],
    (args) => {
      asked.push([...args]);
      const [command, subject = ""] = args;
      if (command === "ls-files") return Object.keys(files).join("\n");
      return files[subject.slice(1)] ?? "";
    },
    {
      write: (text) => {
        refused.push(text);
      },
    },
  );
  return { status, asked, said: refused.join("") };
};

describe("the command line", () => {
  it("reads the applications by that name", () => {
    expect(APPS).toBe("apps");
  });

  it("lists the applications from the index when it is told no pathspec", () => {
    expect(gate({ "apps/web/src/a.ts": "export {};" }).asked[0]).toStrictEqual([
      "ls-files",
      "--",
      APPS,
    ]);
  });

  it("reads each listed file out of the index rather than the working tree", () => {
    expect(gate({ "apps/web/src/a.ts": "export {};" }).asked[1]).toStrictEqual([
      "show",
      ":apps/web/src/a.ts",
    ]);
  });

  it("reads whatever pathspec it is given", () => {
    expect(
      gate({ "somewhere/a.ts": "export {};" }, "somewhere").asked[0],
    ).toStrictEqual(["ls-files", "--", "somewhere"]);
  });

  it("passes a tree that names nothing, and says nothing", () => {
    const { status, said } = gate({ "apps/web/src/a.ts": "export {};" });

    expect(status).toBe(0);
    expect(said).toBe("");
  });

  it("fails and names the file that reaches Cache Storage", () => {
    const { status, said } = gate({
      "apps/web/src/a.ts": "const store = caches;",
    });

    expect(status).toBe(1);
    expect(said).toContain("  apps/web/src/a.ts");
  });

  it("refuses a pathspec matching no tracked file, rather than passing over nothing", () => {
    const { status, said } = gate({});

    expect(status).toBe(1);
    expect(said).toBe(NOTHING);
    expect(said).toContain(
      "Refusing a run over a pathspec that matches no tracked file",
    );
  });
});
