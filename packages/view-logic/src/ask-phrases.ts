import { whenOf } from "./phrases.js";
import type { ProgrammeState } from "./programme.js";

export interface PlayingStatus {
  readonly words: string;
  readonly unreadable: boolean;
}

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
  if (area === undefined || programme.phase === "none")
    return read("Name an area to see what is playing.");
  switch (programme.phase) {
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
