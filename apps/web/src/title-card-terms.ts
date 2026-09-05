import type { SeatProfile } from "@seatscout/client";
import { dayOf, partyOf, seatOf, timeOf } from "./phrases.js";
import { type ProgrammeState, theaterNamed, titleOf } from "./programme.js";
import type { Terms } from "./terms.js";

export type Term =
  | "partySize"
  | "movie"
  | "date"
  | "window"
  | "area"
  | "formats"
  | "amenities"
  | "chains"
  | "theaters"
  | "accessibleSeating"
  | "profile";

export interface TitleCardEntry {
  readonly term: Term;
  readonly words: string;
  readonly joinedBy?: string;
}

type TitleCardLines = readonly [
  readonly TitleCardEntry[],
  readonly TitleCardEntry[],
  readonly TitleCardEntry[],
];

const windowOf = (
  from: string | undefined,
  until: string | undefined,
): string | undefined => {
  if (from !== undefined && until !== undefined)
    return `${timeOf(from)} to ${timeOf(until)}`;
  if (from !== undefined) return `from ${timeOf(from)}`;
  return until === undefined ? undefined : `until ${timeOf(until)}`;
};

const eachValue = (
  term: Term,
  values: readonly string[] | undefined,
): readonly TitleCardEntry[] =>
  values?.map((words, at) => ({
    term,
    words,
    ...(at > 0 && { joinedBy: " or " }),
  })) ?? [];

const narrowedBy = (
  terms: Terms,
  programme: ProgrammeState,
): readonly TitleCardEntry[] => {
  const entries = [
    ...eachValue("formats", terms.formats),
    ...eachValue("amenities", terms.amenities),
    ...eachValue("chains", terms.chains),
    ...eachValue(
      "theaters",
      terms.theaters?.map((id) => theaterNamed(programme.theaters, id)),
    ),
  ];
  return entries.length > 0
    ? entries
    : [{ term: "formats", words: "Any showtime" }];
};

export const termLinesOf = (
  terms: Terms,
  programme: ProgrammeState,
  today: string,
  profile: SeatProfile,
): TitleCardLines => {
  const window = windowOf(terms.from, terms.until);
  return [
    [{ term: "partySize", words: partyOf(terms.partySize) }],
    [
      {
        term: "movie",
        words:
          titleOf(programme.movies, terms.movie) ??
          terms.movie ??
          "Which movie?",
      },
    ],
    [
      { term: "date", words: dayOf(terms.date, today) },
      ...(window === undefined
        ? []
        : [{ term: "window" as const, words: window }]),
      {
        term: "area",
        words: terms.area === undefined ? "Near where?" : `Near ${terms.area}`,
      },
      ...narrowedBy(terms, programme),
      ...(terms.accessibleSeating === true
        ? [{ term: "accessibleSeating" as const, words: "Accessible seating" }]
        : []),
      { term: "profile", words: seatOf(profile) },
    ],
  ];
};
