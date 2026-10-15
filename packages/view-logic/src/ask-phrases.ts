import type { ProgrammeState } from "./programme.js";
import type { Term } from "./title-card-terms.js";
import type { Kind, Span } from "./when.js";
import { whenOf, whenSaidOf } from "./when-phrases.js";

export interface PlayingStatus {
  readonly words: string;
  readonly unreadable: boolean;
}

interface AskWords {
  readonly headings: Readonly<Record<Term, string>>;
  readonly keep: string;
  readonly area: string;
  readonly areaDecides: string;
  readonly areaFirst: string;
  readonly areaFirstWhy: string;
  readonly film: string;
  readonly fewer: string;
  readonly more: string;
  readonly kept: string;
  readonly kinds: Readonly<Record<Kind, string>>;
  readonly from: string;
  readonly until: string;
  readonly anyTime: string;
  readonly clear: string;
  readonly accessible: string;
  readonly accessibleNote: string;
  readonly format: string;
  readonly comfort: string;
  readonly chain: string;
  readonly theater: string;
}

export const ASKING: AskWords = {
  headings: {
    area: "Near where?",
    movie: "Which movie?",
    date: "When?",
    window: "What time?",
    partySize: "How many seats?",
    showtimes: "Which showtimes?",
    profile: "Where you sit",
  },
  keep: "Keep as it was",
  area: "Near, by postal code",
  areaDecides:
    "The films and theaters you can pick are the ones playing near it.",
  areaFirst: "Name an area first.",
  areaFirstWhy:
    "The films listed here are the ones playing near it, so there is nothing to pick from yet.",
  film: "Film",
  fewer: "Fewer seats",
  more: "More seats",
  kept: "Preferences and history stay on this phone. No account exists.",
  kinds: {
    day: "One day",
    days: "Some days",
    range: "A range",
    any: "Any day",
  },
  from: "From",
  until: "Until",
  anyTime: "Any time",
  clear: "Clear",
  accessible: "Accessible seating",
  accessibleNote:
    "Wheelchair and companion seats stay out of ordinary results. Turning this on searches for them deliberately.",
  format: "Format",
  comfort: "Comfort",
  chain: "Chain",
  theater: "Theater",
};

const read = (words: string): PlayingStatus => ({ words, unreadable: false });

const missing = (words: string): PlayingStatus => ({
  words,
  unreadable: true,
});

const nearestOf = (span: Span, today: string) =>
  span.when === undefined ? "" : `, the nearest of ${whenSaidOf(span, today)}`;

const countOf = (count: number, one: string) =>
  `${count} ${one}${count === 1 ? "" : "s"}`;

export const playingStatusOf = (
  programme: ProgrammeState,
  area: string | undefined,
  span: Span,
  today: string,
): PlayingStatus => {
  switch (programme.phase) {
    case "none":
      return read("Name an area to see what is playing.");
    case "reading":
      return read(`Reading what is playing near ${area}`);
    case "unreachable":
      return missing(`What is playing near ${area} could not be read.`);
    case "read": {
      const unreached = programme.unreached.map((theater) => theater.name);
      return unreached.length > 0
        ? missing(
            `Films at ${countOf(unreached.length, "theater")} could not be read: ${unreached.join(", ")}.`,
          )
        : read(
            `${countOf(programme.movies.length, "film")} playing near ${area} ${whenOf(span.date, today)}${nearestOf(span, today)}`,
          );
    }
  }
};
