import { describe, expect, it } from "vitest";
import { closing, lineOf, namedIn } from "./classes.ts";

describe("the classes a module puts on an element", () => {
  it("takes every name a quoted className holds, with the line it is on", () => {
    expect(
      namedIn(
        "card.tsx",
        '<div>\n  <span className="btn btn-velvet" />\n</div>',
      ),
    ).toStrictEqual([
      { file: "card.tsx", line: 2, name: "btn" },
      { file: "card.tsx", line: 2, name: "btn-velvet" },
    ]);
  });

  it("takes both arms of an expression that picks between two spellings", () => {
    expect(
      namedIn(
        "row.tsx",
        "<p className={unreached ? \"ledger-row unr\" : 'ledger-row'} />",
      ),
    ).toStrictEqual([
      { file: "row.tsx", line: 1, name: "ledger-row" },
      { file: "row.tsx", line: 1, name: "unr" },
      { file: "row.tsx", line: 1, name: "ledger-row" },
    ]);
  });

  it("takes a class a template interpolates as one of two spellings", () => {
    expect(
      namedIn(
        "chip.tsx",
        `<span className={\`chip \${on ? 'sorted' : "held"} lit\`} />`,
      ),
    ).toStrictEqual([
      { file: "chip.tsx", line: 1, name: "chip" },
      { file: "chip.tsx", line: 1, name: "lit" },
      { file: "chip.tsx", line: 1, name: "sorted" },
      { file: "chip.tsx", line: 1, name: "held" },
    ]);
  });

  it("takes the written parts of a template and none of the values it interpolates", () => {
    expect(
      namedIn(
        "chip.tsx",
        `<span className={\`chip \${on ? sorted : held} lit\`} />`,
      ),
    ).toStrictEqual([
      { file: "chip.tsx", line: 1, name: "chip" },
      { file: "chip.tsx", line: 1, name: "lit" },
    ]);
  });

  it("keeps the names a template writes either side of a hole apart", () => {
    expect(
      namedIn("chip.tsx", `<span className={\`chip\${on}lit\`} />`),
    ).toStrictEqual([
      { file: "chip.tsx", line: 1, name: "chip" },
      { file: "chip.tsx", line: 1, name: "lit" },
    ]);
  });

  it("reads nothing off a module that dresses no element", () => {
    expect(namedIn("plan.ts", "export const marksOf = () => 1;")).toStrictEqual(
      [],
    );
  });

  it("refuses a className spelled in a way it cannot read, naming where", () => {
    expect(() =>
      namedIn("odd.tsx", "<p className={'a'} />\n<p className='a' />"),
    ).toThrow("odd.tsx:2 spells a className this check cannot read");
  });

  it("refuses a className whose expression is never closed", () => {
    expect(() => namedIn("odd.tsx", '<p className={"a"')).toThrow(
      "a className opens an expression that is never closed",
    );
  });
});

describe("reading a source by position", () => {
  it("closes an expression on the brace that matches the one it opened", () => {
    expect(closing(`{\`a \${{ b: "c" }}\`}x`, 0)).toBe(18);
  });

  it("counts from the brace it is given, not from the first one in the source", () => {
    expect(closing("{} {b}", 3)).toBe(5);
  });

  it("refuses a position that opens no expression at all", () => {
    expect(() => closing("nothing", 0)).toThrow(
      "a className opens an expression that is never closed",
    );
  });

  it("counts the lines a source has run through by an index", () => {
    expect(lineOf("a\nbb\nccc", 0)).toBe(1);
    expect(lineOf("a\nbb\nccc", 2)).toBe(2);
    expect(lineOf("a\nbb\nccc", 7)).toBe(3);
  });
});
