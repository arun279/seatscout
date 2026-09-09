import { describe, expect, it } from "vitest";
import { bareIn, beside, linked, ruledIn, STYLESHEET } from "./sheets.ts";

describe("the stylesheets a page links", () => {
  it("takes the href of every stylesheet link and of no other link", () => {
    expect(STYLESHEET).toBe('rel="stylesheet"');
    expect(
      linked(
        '<link rel="icon" href="/icon.svg" />\n' +
          '<link rel="stylesheet" href="/house.css" />\n' +
          '<link rel="preload" href="/fonts/mono.woff2" as="font" />\n' +
          '<link rel="stylesheet" href="/ask.css" />',
      ),
    ).toStrictEqual(["/house.css", "/ask.css"]);
  });

  it("links nothing when the page links no stylesheet", () => {
    expect(linked('<link rel="icon" href="/icon.svg" />')).toStrictEqual([]);
  });

  it("refuses a stylesheet link that names no file", () => {
    expect(() => linked('<link rel="stylesheet" />')).toThrow(
      "links a stylesheet with no href",
    );
  });

  it("finds a sheet beside the page that links it, however the href is spelled", () => {
    expect(beside("apps/web/public/index.html", "/house.css")).toBe(
      "apps/web/public/house.css",
    );
    expect(beside("apps/web/public/index.html", "house.css")).toBe(
      "apps/web/public/house.css",
    );
  });
});

describe("the classes a stylesheet rules", () => {
  it("names every class a selector list carries, and reads none out of a declaration", () => {
    expect(
      ruledIn(".card,\n.rerun .display {\n  border-radius: 14px;\n}"),
    ).toStrictEqual(["card", "rerun", "display"]);
  });

  it("reads the rules an at-rule holds without reading its own prelude", () => {
    expect(
      ruledIn(
        ".card {\n  gap: 4px;\n}\n\n@media (min-width: 20.5em) {\n  .lit {\n    color: blue;\n  }\n}",
      ),
    ).toStrictEqual(["card", "lit"]);
  });

  it("reads a comment as the separator it is, rather than joining what it sat between", () => {
    expect(ruledIn(".ca/* and */rd { color: red; }")).toStrictEqual(["ca"]);
  });

  it("rules nothing a commented out rule names", () => {
    expect(
      ruledIn("/* .ghost {\n  color: red;\n} */\n.card {\n  color: red;\n}"),
    ).toStrictEqual(["card"]);
  });

  it("reads no class out of a dot that names none", () => {
    expect(ruledIn(". { color: red; }")).toStrictEqual([]);
  });

  it("rules nothing when the sheet holds no rule", () => {
    expect(ruledIn("")).toStrictEqual([]);
  });

  it("reads a class ruled on its own, and no class ruled only as part of a wider selector", () => {
    expect(
      bareIn(
        ".card {\n  color: red;\n}\n" +
          ".ask .chip {\n  color: red;\n}\n" +
          ".chip:disabled {\n  color: red;\n}\n" +
          ".lit,\n.card {\n  color: red;\n}\n",
      ),
    ).toStrictEqual(["card", "lit", "card"]);
  });

  it("reads a class ruled on its own inside a media query, and none out of the query itself", () => {
    expect(
      bareIn("@media (min-width: 20em) {\n.lit {\n  color: red;\n}\n}"),
    ).toStrictEqual(["lit"]);
  });

  it("reads a comment as the separator it is, so what sat either side of one is not one bare class", () => {
    expect(bareIn(".ca/* and */rd { color: red; }")).toStrictEqual([]);
  });

  it("reads nothing bare out of a sheet whose every rule is scoped", () => {
    expect(
      bareIn(".ask .chip { color: red; }\n.room > .legend { gap: 0; }"),
    ).toStrictEqual([]);
  });
});
