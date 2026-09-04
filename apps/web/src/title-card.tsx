import { Fragment } from "react";
import { dayOf, partyOf, windowOf } from "./phrases.js";
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
  | "accessibleSeating";

interface Line {
  readonly term: Term;
  readonly text: string;
}

interface TitleCardProps {
  readonly terms: Terms;
  readonly programme: ProgrammeState;
  readonly today: string;
  readonly onEdit: (term: Term) => void;
}

const named = (
  term: Term,
  list: readonly string[] | undefined,
): readonly Line[] =>
  list === undefined ? [] : [{ term, text: list.join(" or ") }];

const askedFor = (terms: Terms, programme: ProgrammeState): readonly Line[] => {
  const lines = [
    ...named("formats", terms.formats),
    ...named("amenities", terms.amenities),
    ...named("chains", terms.chains),
    ...named(
      "theaters",
      terms.theaters?.map((id) => theaterNamed(programme.theaters, id)),
    ),
  ];
  return lines.length > 0 ? lines : [{ term: "formats", text: "Any showtime" }];
};

const linesOf = (
  terms: Terms,
  programme: ProgrammeState,
  today: string,
): readonly Line[] => {
  const window = windowOf(terms.from, terms.until);
  return [
    { term: "date", text: dayOf(terms.date, today) },
    ...(window === undefined
      ? []
      : [{ term: "window" as const, text: window }]),
    {
      term: "area",
      text: terms.area === undefined ? "Near where?" : `Near ${terms.area}`,
    },
    ...askedFor(terms, programme),
    ...(terms.accessibleSeating === true
      ? [{ term: "accessibleSeating" as const, text: "Accessible seating" }]
      : []),
  ];
};

export const TitleCard = ({
  terms,
  programme,
  today,
  onEdit,
}: TitleCardProps) => (
  <header className="title-card">
    <p className="eyebrow">Your query · tap any line to change it</p>
    <h1 className="display line1">
      <button
        type="button"
        className="term"
        onClick={() => onEdit("partySize")}
      >
        {partyOf(terms.partySize)}
      </button>
    </h1>
    <p className="display line2">
      <button type="button" className="term" onClick={() => onEdit("movie")}>
        {titleOf(programme.movies, terms.movie) ??
          terms.movie ??
          "Which movie?"}
      </button>
    </p>
    <p className="line3">
      {linesOf(terms, programme, today).map((line) => (
        <Fragment key={line.term}>
          <button
            type="button"
            className="term"
            onClick={() => onEdit(line.term)}
          >
            {line.text}
          </button>
          {" · "}
        </Fragment>
      ))}
      <span>Reference seat</span>
    </p>
  </header>
);
