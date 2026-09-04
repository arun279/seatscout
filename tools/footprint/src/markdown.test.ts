import { describe, expect, it } from "vitest";
import { table, verdict } from "./markdown.js";

describe("a table", () => {
  it("ranges a column of figures right and a column of words left", () => {
    expect(
      table(
        ["Bundle", "Brotli"],
        [
          ["web app", "15 B"],
          ["proxy", "90 B"],
        ],
      ),
    ).toStrictEqual([
      "| Bundle | Brotli |",
      "| --- | ---: |",
      "| web app | 15 B |",
      "| proxy | 90 B |",
    ]);
  });

  it("ranges a column left as soon as one cell in it is not a figure", () => {
    expect(table(["Where"], [["12"], ["`packages/core/src/seat.ts`"]])[1]).toBe(
      "| --- |",
    );
  });

  it("ranges a column right when every cell in it is a figure, first column included", () => {
    expect(table(["Score"], [["100.00"]])[1]).toBe("| ---: |");
  });

  it("ranges an empty column left rather than claiming it holds figures", () => {
    expect(table(["Bundle", "Brotli"], [["web app", ""]])[1]).toBe(
      "| --- | --- |",
    );
  });
});

describe("a verdict", () => {
  it("says it is within the limit and nothing else", () => {
    expect(verdict(true, "raise the ratchet")).toBe("Within it.");
  });

  it("says it is above the limit and how to get through", () => {
    expect(verdict(false, "raise the ratchet")).toBe(
      "Above it. raise the ratchet",
    );
  });
});
