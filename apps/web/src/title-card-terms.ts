import { dayOf, partyOf } from "./phrases.js";
import type { Terms } from "./terms.js";

export type Term = "partySize" | "movie" | "date" | "area";

export interface TitleCardEntry {
  readonly term?: Term;
  readonly words: string;
}

type TitleCardLines = readonly [
  readonly TitleCardEntry[],
  readonly TitleCardEntry[],
  readonly TitleCardEntry[],
];

export const termLinesOf = (terms: Terms, today: string): TitleCardLines => [
  [{ term: "partySize", words: partyOf(terms.partySize) }],
  [{ term: "movie", words: terms.movie ?? "Which movie?" }],
  [
    { term: "date", words: dayOf(terms.date, today) },
    {
      term: "area",
      words: terms.area === undefined ? "Near where?" : `Near ${terms.area}`,
    },
    { words: "Any format" },
    { words: "Reference seat" },
  ],
];
