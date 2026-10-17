import type { SeatProfile } from "@seatscout/client";
import { ASKING } from "./ask-phrases.js";
import { partyOf, seatOf, timeOf } from "./phrases.js";
import { filmOf, type ProgrammeState, theaterNamed } from "./programme.js";
import type { Terms } from "./terms.js";
import { whenWordsOf } from "./when-phrases.js";

export const TERMS = [
  "partySize",
  "area",
  "movie",
  "date",
  "window",
  "narrowing",
  "profile",
] as const;

export type Term = (typeof TERMS)[number];

export interface TitleCardEntry {
  readonly term: Term;
  readonly words: string;
}

interface TitleCardGroup {
  readonly lead: string;
  readonly entries: readonly TitleCardEntry[];
}

export interface TitleCard {
  readonly party: string;
  readonly area: string;
  readonly movie: string;
  readonly groups: readonly TitleCardGroup[];
}

const windowOf = (from: string | undefined, until: string | undefined) => {
  if (from !== undefined && until !== undefined)
    return `${timeOf(from)} to ${timeOf(until)}`;
  if (from !== undefined) return `From ${timeOf(from)}`;
  return until === undefined ? "Any time" : `Until ${timeOf(until)}`;
};

const theatersOf = (terms: Terms, programme: ProgrammeState) => {
  const narrowed = [
    ...(terms.formats ?? []),
    ...(terms.amenities ?? []),
    ...(terms.chains ?? []),
    ...(terms.theaters ?? []).map((id) => theaterNamed(programme.theaters, id)),
  ];
  return (narrowed.length > 0 ? narrowed : ["Any theater"]).map(
    (words): TitleCardEntry => ({ term: "narrowing", words }),
  );
};

export const titleCardOf = (
  terms: Terms,
  programme: ProgrammeState,
  today: string,
  profile: SeatProfile,
): TitleCard => ({
  party: partyOf(terms.partySize),
  area: terms.area === undefined ? ASKING.headings.area : `Near ${terms.area}`,
  movie:
    terms.movie === undefined
      ? ASKING.headings.movie
      : filmOf(programme.movies, terms),
  groups: [
    {
      lead: "When",
      entries: [
        { term: "date", words: whenWordsOf(terms, today) },
        { term: "window", words: windowOf(terms.from, terms.until) },
      ],
    },
    {
      lead: "Where",
      entries: [
        ...theatersOf(terms, programme),
        ...(terms.accessibleSeating === true
          ? [{ term: "partySize" as const, words: "Accessible seating" }]
          : []),
        { term: "profile", words: seatOf(profile) },
      ],
    },
  ],
});
