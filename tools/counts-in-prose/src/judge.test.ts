import { describe, expect, it } from "vitest";
import {
  agreement,
  type Claim,
  disagreements,
  NUMBERS,
  refusal,
} from "./judge.ts";

const claim = (over: Partial<Claim> = {}): Claim => ({
  document: "a.md",
  says: /It holds (\w+) things\./,
  about: "the things in a.ts",
  count: () => 3,
  ...over,
});

const reading =
  (files: Readonly<Record<string, string>>) =>
  (path: string): string => {
    const source = files[path];
    if (source === undefined) throw new Error(`no such file: ${path}`);
    return source;
  };

const found = (over: Partial<Claim>, source = "It holds three things.") =>
  disagreements([claim(over)], reading({ "a.md": source }));

describe("the number words", () => {
  it("spells every count from zero to ninety nine, in order", () => {
    expect(NUMBERS).toHaveLength(100);
    expect(NUMBERS[0]).toBe("zero");
    expect(NUMBERS[19]).toBe("nineteen");
    expect(NUMBERS[20]).toBe("twenty");
    expect(NUMBERS[21]).toBe("twenty one");
    expect(NUMBERS[99]).toBe("ninety nine");
  });
});

describe("holding a sentence to a structure", () => {
  it("says nothing when the count and the structure agree", () => {
    expect(found({})).toStrictEqual([]);
  });

  it("names the structure and its real count when they disagree", () => {
    expect(found({ count: () => 4 })[0]?.disagreement).toBe(
      '"It holds three things." counts the things in a.ts, and there are 4',
    );
  });

  it("reads a sentence broken across lines", () => {
    expect(found({}, "It holds\n  three\n  things.")).toStrictEqual([]);
  });

  it("refuses a sentence that has been reworded away", () => {
    expect(found({}, "It holds a few things.")[0]?.disagreement).toBe(
      "/It holds (\\w+) things\\./ matches 0 sentences, not one",
    );
  });

  it("refuses a sentence that matches more than once", () => {
    expect(
      found({}, "It holds three things. It holds three things.")[0]
        ?.disagreement,
    ).toBe("/It holds (\\w+) things\\./ matches 2 sentences, not one");
  });

  it("refuses a count spelled in a way it cannot read", () => {
    expect(found({}, "It holds many things.")[0]?.disagreement).toBe(
      '"It holds many things." spells a count this check cannot read',
    );
  });

  it("refuses a pair whose sentence carries no count at all", () => {
    expect(
      found({ says: /It holds things\./ }, "It holds things.")[0]?.disagreement,
    ).toBe('"It holds things." spells a count this check cannot read');
  });

  it("carries the reason a structure could not be counted", () => {
    expect(
      found({
        count: () => {
          throw new Error("a.ts declares no interface Seat");
        },
      })[0]?.disagreement,
    ).toBe("a.ts declares no interface Seat");
  });

  it("carries something thrown that is not an error", () => {
    expect(
      found({
        count: () => {
          throw "a.ts is gone";
        },
      })[0]?.disagreement,
    ).toBe("a.ts is gone");
  });

  it("judges every pair rather than stopping at the first that disagrees", () => {
    const read = reading({ "a.md": "It holds three things." });

    expect(
      disagreements(
        [claim({ count: () => 4 }), claim({}), claim({ count: () => 5 })],
        read,
      ),
    ).toHaveLength(2);
  });
});

describe("what the gate says", () => {
  it("names the document, the sentence and the structure of every disagreement", () => {
    expect(
      refusal([
        { claim: claim({}), disagreement: "a.md says three, and there are 4" },
      ]),
    ).toBe(
      "1 count(s) stated in prose could not be held to the structure they count:\n" +
        "  a.md: a.md says three, and there are 4\n\n" +
        "Correct the sentence, or the structure. If a sentence has moved or been reworded,\n" +
        "follow it in tools/counts-in-prose/src/claims.ts, where every pair is declared.\n",
    );
  });

  it("names every structure it held, once each, when they all agree", () => {
    expect(
      agreement([claim({}), claim({}), claim({ about: "the bands in b.ts" })]),
    ).toBe(
      "Every count stated in prose matches the structure it counts, over 3 declared pairs:\n" +
        "  the things in a.ts\n  the bands in b.ts\n",
    );
  });
});
