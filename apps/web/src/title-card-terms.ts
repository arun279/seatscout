import { dayOf, partyOf } from "./phrases.js";
import type { Terms } from "./terms.js";

export type Term = "partySize" | "movie" | "date" | "area";

export interface TitleCardEntry {
  readonly term?: Term;
  readonly words: string;
}

export interface TitleCardLine {
  readonly kind: "party" | "movie" | "details";
  readonly entries: readonly TitleCardEntry[];
}

export const termLinesOf = (
  terms: Terms,
  today: string,
): readonly TitleCardLine[] => [
  {
    kind: "party",
    entries: [{ term: "partySize", words: partyOf(terms.partySize) }],
  },
  {
    kind: "movie",
    entries: [{ term: "movie", words: terms.movie ?? "Which movie?" }],
  },
  {
    kind: "details",
    entries: [
      { term: "date", words: dayOf(terms.date, today) },
      {
        term: "area",
        words: terms.area === undefined ? "Near where?" : `Near ${terms.area}`,
      },
      { words: "Any format" },
      { words: "Reference seat" },
    ],
  },
];
