import type { Kind } from "./when.js";
import { whenOf } from "./when-phrases.js";
import type { ProgrammeState } from "./programme.js";

export interface PlayingStatus {
  readonly words: string;
  readonly unreadable: boolean;
}

interface AskWords {
  readonly heading: string;
  readonly keep: string;
  readonly area: string;
  readonly areaDecides: string;
  readonly film: string;
  readonly when: string;
  readonly party: string;
  readonly fewer: string;
  readonly more: string;
  readonly kept: string;
  readonly kinds: Readonly<Record<Kind, string>>;
  readonly addDay: string;
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
  heading: "What are we seeing?",
  keep: "Keep as it was",
  area: "Near, by postal code",
  areaDecides: "The films and theaters below are the ones playing near it.",
  film: "Film",
  when: "When",
  party: "Party",
  fewer: "Fewer seats",
  more: "More seats",
  kept: "Preferences and history stay on this phone. No account exists.",
  kinds: {
    day: "One day",
    days: "Some days",
    range: "A range",
    any: "Any day",
  },
  addDay: "Add a day",
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

const countOf = (count: number, one: string) =>
  `${count} ${one}${count === 1 ? "" : "s"}`;

export const playingStatusOf = (
  programme: ProgrammeState,
  area: string | undefined,
  date: string,
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
            `${countOf(programme.movies.length, "film")} playing near ${area} ${whenOf(date, today)}`,
          );
    }
  }
};
