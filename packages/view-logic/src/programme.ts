import type { Movie, Programme, SeatScout, Theater } from "@seatscout/client";
import { signal } from "./signal.js";

interface Reading {
  readonly phase: "none" | "reading" | "unreachable";
  readonly theaters: readonly Theater[];
  readonly movies: readonly Movie[];
}

interface Read extends Programme {
  readonly phase: "read";
}

export type ProgrammeState = Reading | Read;

export interface HeldProgramme {
  readonly area: string | undefined;
  readonly date: string;
  readonly snapshot: () => ProgrammeState;
  readonly subscribe: (onChange: () => void) => () => void;
}

const NONE: Reading = {
  phase: "none",
  theaters: [],
  movies: [],
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

interface Picked {
  readonly movie?: string | undefined;
  readonly title?: string | undefined;
}

export const knownFilms = (
  movies: readonly Movie[],
  { movie, title }: Picked,
): readonly Movie[] =>
  movie === undefined ||
  title === undefined ||
  titleOf(movies, movie) !== undefined
    ? movies
    : [...movies, { id: movie, title }];

export const chosenFrom = (typed: string, movies: readonly Movie[]): Picked => {
  const movie = movieOf(typed, movies);
  return { movie, title: titleOf(movies, movie) };
};

export const carriedTitleOf = ({ title }: Picked): string =>
  title ?? "Your movie";

export const filmOf = (movies: readonly Movie[], picked: Picked): string =>
  titleOf(movies, picked.movie) ?? carriedTitleOf(picked);

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

export const offeredFor = (
  typed: string,
  movies: readonly Movie[],
): readonly Movie[] => {
  const title = typed.trim().toLowerCase();
  const matching = movies.filter((movie) =>
    movie.title.toLowerCase().includes(title),
  );
  return matching.some((movie) => movie.title.toLowerCase() === title)
    ? []
    : matching;
};

export const markedIn = (
  title: string,
  typed: string,
): readonly [string, string, string] => {
  const looked = typed.trim();
  const at = title.toLowerCase().indexOf(looked.toLowerCase());
  return looked === "" || at < 0
    ? [title, "", ""]
    : [
        title.slice(0, at),
        title.slice(at, at + looked.length),
        title.slice(at + looked.length),
      ];
};
