import { describe, expect, it } from "vitest";
import { spelled } from "./escapes.ts";

describe("spelling a source out", () => {
  it("leaves a source carrying no escape exactly as it was", () => {
    expect(spelled("const store = caches;")).toBe("const store = caches;");
  });

  it("reads a braced code point", () => {
    expect(spelled('self["\\u{63}aches"]')).toBe('self["caches"]');
  });

  it("reads a four digit code point", () => {
    expect(spelled('self["\\u0063aches"]')).toBe('self["caches"]');
  });

  it("reads a two digit hex escape", () => {
    expect(spelled('self["\\x63aches"]')).toBe('self["caches"]');
  });

  it("drops the backslash of an identity escape, which needs no digits", () => {
    expect(spelled('self["\\caches"]')).toBe('self["caches"]');
  });

  it.each([
    ["a line feed", "\n"],
    ["a carriage return", "\r"],
    ["a carriage return and line feed", "\r\n"],
    ["a line separator", "\u2028"],
    ["a paragraph separator", "\u2029"],
  ])("takes %s with the backslash that continues the line", (_, terminator) => {
    expect(spelled(`self["c\\${terminator}aches"]`)).toBe('self["caches"]');
  });

  it("reads the highest code point there is", () => {
    expect(spelled("\\u{10FFFF}")).toBe(String.fromCodePoint(0x10ffff));
  });

  it("leaves a code point above the highest alone rather than throwing", () => {
    expect(spelled("\\u{110000}")).toBe("\\u{110000}");
  });
});
