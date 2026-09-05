import type { SeatProfile } from "@seatscout/client";
import { dayOf, partyOf, seatOf } from "./phrases.js";
import type { Terms } from "./terms.js";

export type Term = "partySize" | "movie" | "date" | "area" | "profile";

export interface TitleCardEntry {
  readonly term?: Term;
  readonly words: string;
}

type TitleCardLines = readonly [
  readonly TitleCardEntry[],
  readonly TitleCardEntry[],
  readonly TitleCardEntry[],
];

export const termLinesOf = (
  terms: Terms,
  today: string,
  profile: SeatProfile,
): TitleCardLines => [
  [{ term: "partySize", words: partyOf(terms.partySize) }],
  [{ term: "movie", words: terms.movie ?? "Which movie?" }],
  [
    { term: "date", words: dayOf(terms.date, today) },
    {
      term: "area",
      words: terms.area === undefined ? "Near where?" : `Near ${terms.area}`,
    },
    { words: "Any format" },
    { term: "profile", words: seatOf(profile) },
  ],
];
