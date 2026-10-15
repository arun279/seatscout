import type { SeatProfile } from "@seatscout/client";
import { partyOf, seatOf, timeOf } from "./phrases.js";
import { filmOf, type ProgrammeState, theaterNamed } from "./programme.js";
import type { Terms } from "./terms.js";
import { whenWordsOf } from "./when-phrases.js";

export type Term =
  | "partySize"
  | "area"
  | "movie"
  | "date"
  | "window"
  | "showtimes"
  | "profile";

export interface TitleCardEntry {
  readonly term: Term;
  readonly words: string;
}

export interface TitleCard {
  readonly party: string;
  readonly area: string;
  readonly movie: string;
  readonly chips: readonly TitleCardEntry[];
}

const windowOf = (from: string | undefined, until: string | undefined) => {
  if (from !== undefined && until !== undefined)
    return `${timeOf(from)} to ${timeOf(until)}`;
  if (from !== undefined) return `From ${timeOf(from)}`;
  return until === undefined ? "Any time" : `Until ${timeOf(until)}`;
};

const showtimesOf = (terms: Terms, programme: ProgrammeState) => {
  const narrowed = [
    ...(terms.formats ?? []),
    ...(terms.amenities ?? []),
    ...(terms.chains ?? []),
    ...(terms.theaters ?? []).map((id) => theaterNamed(programme.theaters, id)),
  ];
  return (narrowed.length > 0 ? narrowed : ["Any showtime"]).map(
    (words): TitleCardEntry => ({ term: "showtimes", words }),
  );
};

export const titleCardOf = (
  terms: Terms,
  programme: ProgrammeState,
  today: string,
  profile: SeatProfile,
): TitleCard => ({
  party: partyOf(terms.partySize),
  area: terms.area === undefined ? "Near where?" : `Near ${terms.area}`,
  movie:
    terms.movie === undefined
      ? "Which movie?"
      : filmOf(programme.movies, terms),
  chips: [
    { term: "date", words: whenWordsOf(terms, today) },
    { term: "window", words: windowOf(terms.from, terms.until) },
    ...showtimesOf(terms, programme),
    ...(terms.accessibleSeating === true
      ? [{ term: "partySize" as const, words: "Accessible seating" }]
      : []),
    { term: "profile", words: seatOf(profile) },
  ],
});
