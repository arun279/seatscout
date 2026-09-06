import { describe, expect, it } from "vitest";
import { HTML, main, MODULES, NOTHING } from "./main.ts";

const PAGE =
  '<link rel="stylesheet" href="/house.css" />\n<link rel="stylesheet" href="/ask.css" />';

const gate = async (
  files: Readonly<Record<string, string>>,
  modules: readonly string[],
  ...argv: readonly string[]
) => {
  const asked: string[] = [];
  const refused: string[] = [];
  const status = await main(
    ["node", "classes", ...argv],
    async (path) => {
      asked.push(path);
      const source = files[path];
      if (source === undefined) throw new Error(`no such file: ${path}`);
      return source;
    },
    async (pattern) => {
      asked.push(pattern);
      return modules;
    },
    {
      write: (text) => {
        refused.push(text);
      },
    },
  );
  return { status, asked, said: refused.join("") };
};

const tree = (modules: Readonly<Record<string, string>>) => ({
  files: {
    "apps/web/public/index.html": PAGE,
    "apps/web/public/house.css": ".card {\n  display: flex;\n}",
    "apps/web/public/ask.css": ".said {\n  color: red;\n}",
    ...modules,
  },
  modules: Object.keys(modules),
});

describe("the command line", () => {
  it("reads the screen's modules and the sheets the page links, by those names", async () => {
    const { files, modules } = tree({
      "apps/web/src/card.tsx": '<span className="card" />',
    });

    expect(HTML).toBe("apps/web/public/index.html");
    expect(MODULES).toBe("apps/web/src/**/*.tsx");
    expect((await gate(files, modules)).asked).toStrictEqual([
      MODULES,
      HTML,
      "apps/web/public/house.css",
      "apps/web/public/ask.css",
      "apps/web/src/card.tsx",
    ]);
  });

  it("reads whatever page and pattern it is given", async () => {
    const files = {
      "planted/index.html": PAGE,
      "planted/house.css": ".card {\n  display: flex;\n}",
      "planted/ask.css": ".said {\n  color: red;\n}",
      "planted/offends.tsx.txt": '<span className="card" />',
    };

    expect(
      (
        await gate(
          files,
          ["planted/offends.tsx.txt"],
          "planted/index.html",
          "planted/*.tsx.txt",
        )
      ).asked,
    ).toStrictEqual([
      "planted/*.tsx.txt",
      "planted/index.html",
      "planted/house.css",
      "planted/ask.css",
      "planted/offends.tsx.txt",
    ]);
  });

  it("passes a tree whose every class is ruled, and says nothing", async () => {
    const { files, modules } = tree({
      "apps/web/src/card.tsx": '<span className="card said" />',
    });
    const { status, said } = await gate(files, modules);

    expect(status).toBe(0);
    expect(said).toBe("");
  });

  it("fails and names the file, the line and the class no sheet rules", async () => {
    const { files, modules } = tree({
      "apps/web/src/card.tsx": '<span className="card ghost" />',
      "apps/web/src/ask.tsx": '<p\n  className="micro centred"\n/>',
    });
    const { status, said } = await gate(files, modules);

    expect(status).toBe(1);
    expect(said).toBe(
      "Refusing 3 class(es) named in a className with no rule in any linked stylesheet:\n" +
        "  apps/web/src/ask.tsx:2 .micro\n" +
        "  apps/web/src/ask.tsx:2 .centred\n" +
        "  apps/web/src/card.tsx:1 .ghost\n" +
        "\nA class the markup carries and no stylesheet rules draws nothing, so the surface goes\n" +
        "out unstyled where its board draws it. Add the rule to the stylesheet that owns the\n" +
        "surface, or take the class off the element. CONTRIBUTING.md says which owns what.\n",
    );
  });

  it("refuses a pattern matching no module, rather than passing over nothing", async () => {
    const { files } = tree({});
    const { status, said } = await gate(files, []);

    expect(status).toBe(1);
    expect(said).toBe(NOTHING);
    expect(said).toContain(
      "Refusing a run over a pattern that matches no module",
    );
  });
});
