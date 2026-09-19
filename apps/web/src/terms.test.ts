import { describe, expect, it } from "vitest";
import { queryOf, termsIn } from "./terms.js";
import { EVERY_TERM, TODAY } from "./terms.fixtures.js";

describe("the query string a URL carries the terms in", () => {
  it("reads every term out of the query string and writes it back as it stood", () => {
    expect(queryOf(termsIn(EVERY_TERM, TODAY))).toBe(EVERY_TERM);
  });

  it("reads a query string that names nothing as no terms at all", () => {
    expect(termsIn("", TODAY)).toEqual({ date: TODAY, partySize: 2 });
  });

  it("decodes what the query string escaped, and escapes what a term holds", () => {
    expect(termsIn("?movie=a+b&area=c%26d&partySize=3", TODAY)).toEqual({
      movie: "a b",
      date: TODAY,
      area: "c&d",
      partySize: 3,
    });
    expect(
      queryOf({ movie: "a b", date: TODAY, area: "c&d", partySize: 3 }),
    ).toBe("?movie=a+b&date=2026-08-28&area=c%26d&partySize=3");
  });
});
