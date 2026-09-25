import { describe, expect, it } from "vitest";
import { costOf, unreadOf, whenSaidOf, whenWordsOf } from "./when-phrases.js";
import { spanOf } from "./when.js";

const TODAY = "2026-09-03";

const said = (...asked: readonly string[]) =>
  whenWordsOf(spanOf(asked, TODAY), TODAY);

describe("the when term, as the sentence says it", () => {
  it("says one day as today, tomorrow or the date", () => {
    expect(said(TODAY)).toBe("Today");
    expect(said("2026-09-04")).toBe("Tomorrow");
    expect(said("2026-09-05")).toBe("Sat 5 Sep");
  });

  it("lists up to three days picked, naming each month once after its last day", () => {
    expect(said("2026-09-04", "2026-09-05", "2026-09-06")).toBe(
      "Fri 4, Sat 5, Sun 6 Sep",
    );
    expect(said("2026-09-30", "2026-10-01")).toBe("Wed 30 Sep, Thu 1 Oct");
  });

  it("counts more than three days picked", () => {
    expect(
      said(
        "2026-09-04",
        "2026-09-05",
        "2026-09-06",
        "2026-09-08",
        "2026-09-10",
      ),
    ).toBe("5 days picked");
  });

  it("says a range by its ends, naming a month the two ends share once", () => {
    expect(said("2026-09-04..2026-09-13")).toBe("Fri 4 to Sun 13 Sep");
    expect(said("2026-09-30..2026-10-06")).toBe("Wed 30 Sep to Tue 6 Oct");
  });

  it("names the horizon as a number of days", () => {
    expect(said("any")).toBe("Any day in the next 7 days");
  });
});

describe("what more than one day costs, said before the search", () => {
  it("says nothing for one day", () => {
    expect(costOf(spanOf(["2026-09-05"], TODAY), TODAY)).toBeUndefined();
  });

  it("counts the days of reading and says which comes back first", () => {
    expect(costOf(spanOf(["any"], TODAY), TODAY)).toBe(
      "7 days is 7 days of reading. The nearest day comes back first.",
    );
    expect(costOf(spanOf(["2026-09-04", "2026-09-06"], TODAY), TODAY)).toBe(
      "2 days is 2 days of reading. The nearest day comes back first.",
    );
  });
});

describe("the days a search has not read yet", () => {
  const unread = (...asked: readonly string[]) =>
    unreadOf(spanOf(asked, TODAY), TODAY);

  it("says nothing when the search holds one day", () => {
    expect(unread("2026-09-05")).toBeUndefined();
  });

  it("names the days after the nearest as a span when the days run on", () => {
    expect(unread("2026-09-04..2026-09-13")).toBe(
      "Sat 5 to Sun 13 Sep not read yet",
    );
    expect(unread("any")).toBe("Fri 4 to Wed 9 Sep not read yet");
    expect(unread("2026-09-04..2026-09-05")).toBe("Sat 5 Sep not read yet");
  });

  it("names the days picked after the nearest, and counts them past three", () => {
    expect(unread("2026-09-04", "2026-09-06")).toBe("Sun 6 Sep not read yet");
    expect(
      unread(
        "2026-09-04",
        "2026-09-05",
        "2026-09-06",
        "2026-09-08",
        "2026-09-10",
      ),
    ).toBe("4 days not read yet");
  });
});

describe("the when term inside a sentence", () => {
  const inSentence = (...asked: readonly string[]) =>
    whenSaidOf(spanOf(asked, TODAY), TODAY);

  it("says one day as the lede always has", () => {
    expect(inSentence(TODAY)).toBe("today");
    expect(inSentence("2026-09-05")).toBe("on Sat 5 Sep");
  });

  it("says several days as the term does, and any day in lower case", () => {
    expect(inSentence("2026-09-04..2026-09-13")).toBe("Fri 4 to Sun 13 Sep");
    expect(inSentence("2026-09-04", "2026-09-06")).toBe("Fri 4, Sun 6 Sep");
    expect(inSentence("any")).toBe("any day in the next 7 days");
  });
});
