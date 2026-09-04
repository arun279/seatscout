import type { Movie, Programme, SeatScout, Theater } from "@seatscout/client";
import { signal } from "./signal.js";

export interface ProgrammeState extends Programme {
  readonly phase: "none" | "reading" | "read" | "unreachable";
}

export interface HeldProgramme {
  readonly area: string | undefined;
  readonly date: string;
  readonly snapshot: () => ProgrammeState;
  readonly subscribe: (onChange: () => void) => () => void;
}

const NONE: ProgrammeState = {
  phase: "none",
  theaters: [],
  movies: [],
  unreached: [],
};

export const programmeNear = (
  seatscout: SeatScout,
  area: string | undefined,
  date: string,
): HeldProgramme => {
  const changes = signal();
  let state: ProgrammeState =
    area === undefined ? NONE : { ...NONE, phase: "reading" };
  if (area !== undefined)
    void seatscout.programme(area, date).then((reading) => {
      state = reading.ok
        ? { phase: "read", ...reading.payload }
        : { ...NONE, phase: "unreachable" };
      changes.notify();
    });
  return {
    area,
    date,
    snapshot: () => state,
    subscribe: changes.subscribe,
  };
};

export const titleOf = (
  movies: readonly Movie[],
  movie: string | undefined,
): string | undefined => movies.find((named) => named.id === movie)?.title;

export const theaterNamed = (
  theaters: readonly Theater[],
  id: string,
): string => theaters.find((theater) => theater.id === id)?.name ?? id;

export const movieOf = (
  typed: string,
  movies: readonly Movie[],
): string | undefined => {
  const title = typed.trim().toLowerCase();
  const named = movies.find((movie) => movie.title.toLowerCase() === title);
  if (named !== undefined) return named.id;
  return /^\d+$/.test(title) ? title : undefined;
};

export const suggestedFor = (
  typed: string,
  movies: readonly Movie[],
): readonly Movie[] => {
  const title = typed.trim().toLowerCase();
  if (title === "") return [];
  const matching = movies.filter((movie) =>
    movie.title.toLowerCase().includes(title),
  );
  return matching.some((movie) => movie.title.toLowerCase() === title)
    ? []
    : matching;
};
