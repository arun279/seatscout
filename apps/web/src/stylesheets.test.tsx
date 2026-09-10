import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const SOURCE = "apps/web/src";
const PLANTED = "apps/web/tests/planted";
const SHARED = "house.css";
const BARE = /^\.[\w-]+$/;

const bareIn = (css: string) => {
  const sheet = document.createElement("style");
  sheet.textContent = css;
  document.head.append(sheet);
  const selectorsIn = (rules: Iterable<CSSRule>): string[] =>
    [...rules].flatMap((rule) => [
      ...(rule instanceof CSSStyleRule ? rule.selectorText.split(",") : []),
      ...(rule instanceof CSSGroupingRule ? selectorsIn(rule.cssRules) : []),
    ]);
  const named = selectorsIn(sheet.sheet?.cssRules ?? [])
    .map((one) => one.trim())
    .filter((one) => BARE.test(one))
    .map((one) => one.slice(1));
  sheet.remove();
  return new Set(named);
};

const bareClassesAcross = async (source: string) => {
  const sheets = (await readdir(source))
    .filter((file) => file.endsWith(".css") && file !== SHARED)
    .sort();
  const where = new Map<string, string[]>();
  for (const sheet of sheets)
    for (const name of bareIn(await readFile(`${source}/${sheet}`, "utf8")))
      where.set(name, [...(where.get(name) ?? []), sheet]);
  return {
    sheets,
    twice: [...where].filter(([, ruling]) => ruling.length > 1),
  };
};

describe("the stylesheets a surface is drawn with", () => {
  it("rule a bare class on one surface at most, so what several draw lives in house.css", async () => {
    const { sheets, twice } = await bareClassesAcross(SOURCE);

    expect(sheets.length).toBeGreaterThan(1);
    expect(twice).toEqual([]);
  });

  it("refuses the two classes the planted surfaces both rule, the one inside a media query included, and leaves what house.css rules beside a surface to it", async () => {
    const { sheets, twice } = await bareClassesAcross(PLANTED);

    expect(sheets).toEqual(["one.css", "two.css"]);
    expect(twice).toEqual([
      ["said", ["one.css", "two.css"]],
      ["lit", ["one.css", "two.css"]],
    ]);
  });
});
