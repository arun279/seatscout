import type { Movie, Reading, Theater } from "@seatscout/core";
import type { CatalogueDependencies } from "./catalogue.js";
import { fannedOut } from "./fan-out.js";
import type { CachedProgramme } from "./store.js";

const CACHE_FOR_MS = 2 * 60 * 60 * 1000;
const ENTRY_SHAPE = 1;

export interface Programme {
  readonly theaters: readonly Theater[];
  readonly movies: readonly Movie[];
  readonly unreached: readonly Theater[];
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  value instanceof Object;

const isCached = (value: unknown): value is CachedProgramme =>
  isRecord(value) &&
  typeof value.fetchedAt === "number" &&
  isRecord(value.programme) &&
  Array.isArray(value.programme.theaters) &&
  Array.isArray(value.programme.movies) &&
  Array.isArray(value.programme.unreached);

const keyOf = (area: string, date: string) =>
  `seatscout.programme.v${ENTRY_SHAPE}.${JSON.stringify([date, area])}`;

const byTitle = (left: Movie, right: Movie) =>
  left.title.localeCompare(right.title, "en");

const playingAt = async (
  deps: CatalogueDependencies,
  theaters: readonly Theater[],
  date: string,
): Promise<Programme> => {
  const movies = new Map<string, Movie>();
  const failed = new Set<string>();
  await fannedOut(theaters, async (theater) => {
    const reading = await deps.source.moviesAt(theater.id, date);
    if (!reading.ok) {
      failed.add(theater.id);
      return;
    }
    for (const movie of reading.payload) movies.set(movie.id, movie);
  });
  return {
    theaters,
    movies: [...movies.values()].toSorted(byTitle),
    unreached: theaters.filter((theater) => failed.has(theater.id)),
  };
};

export const openProgramme = (deps: CatalogueDependencies) => {
  const cacheFor = deps.cacheForMs ?? CACHE_FOR_MS;
  return async (area: string, date: string): Promise<Reading<Programme>> => {
    const key = keyOf(area, date);
    const held = await deps.store.read(key);
    if (isCached(held) && deps.now() - held.fetchedAt < cacheFor)
      return {
        ok: true,
        payload: held.programme,
        fetchedAt: held.fetchedAt,
        attempts: 0,
      };
    const nearby = await deps.source.theatersNear(area);
    if (!nearby.ok) return nearby;
    const programme = await playingAt(deps, nearby.payload, date);
    if (programme.unreached.length === 0)
      await deps.store.write(key, { fetchedAt: nearby.fetchedAt, programme });
    return { ...nearby, payload: programme };
  };
};
