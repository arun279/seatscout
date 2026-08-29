import {
  type Catalogue,
  narrowed,
  type Reading,
  type ShowtimeTerms,
  type Source,
} from "@seatscout/core";
import type { CachedCatalogue, KeyValueStore } from "./store.js";

const CACHE_FOR_MS = 2 * 60 * 60 * 1000;
const ENTRY_SHAPE = 1;

export interface ListingTerms {
  readonly movie: string;
  readonly date: string;
  readonly area: string;
}

export interface CatalogueTerms extends ListingTerms, ShowtimeTerms {}

export interface CatalogueDependencies {
  readonly source: Source;
  readonly store: KeyValueStore;
  readonly now: () => number;
  readonly cacheForMs?: number;
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  value instanceof Object;

const isCached = (value: unknown): value is CachedCatalogue =>
  isRecord(value) &&
  typeof value.fetchedAt === "number" &&
  isRecord(value.catalogue) &&
  Array.isArray(value.catalogue.bookable) &&
  Array.isArray(value.catalogue.unbookable) &&
  Array.isArray(value.catalogue.unidentified);

const keyOf = (terms: ListingTerms) =>
  `seatscout.catalogue.v${ENTRY_SHAPE}.${JSON.stringify([terms.movie, terms.date, terms.area])}`;

export const openCatalogue = (deps: CatalogueDependencies) => {
  const cacheFor = deps.cacheForMs ?? CACHE_FOR_MS;
  return async (terms: CatalogueTerms): Promise<Reading<Catalogue>> => {
    const key = keyOf(terms);
    const held = await deps.store.read(key);
    if (isCached(held) && deps.now() - held.fetchedAt < cacheFor)
      return {
        ok: true,
        payload: narrowed(held.catalogue, terms),
        fetchedAt: held.fetchedAt,
        attempts: 0,
      };
    const reading = await deps.source.showtimesFor(
      terms.movie,
      terms.date,
      terms.area,
    );
    if (!reading.ok) return reading;
    await deps.store.write(key, {
      fetchedAt: reading.fetchedAt,
      catalogue: reading.payload,
    });
    return { ...reading, payload: narrowed(reading.payload, terms) };
  };
};
