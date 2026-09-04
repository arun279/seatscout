import { type Catalogue, type Reading, openSource } from "@seatscout/core";
import { type UpstreamScript, fakeUpstream } from "@seatscout/core/testing";
import { type CatalogueTerms, openCatalogue } from "./catalogue.js";
import { type KeyValueStore, inMemoryStore } from "./store.js";

const AREA = "75006";
export const TODAY = "2026-08-28";
export const YESTERDAY = "2026-08-27";
export const WIDE_RELEASE = "245569";
export const LISTINGS = "/napi/theaterShowtimeGroupings";
export const TERMS: CatalogueTerms = {
  movie: WIDE_RELEASE,
  date: TODAY,
  area: AREA,
};
export const FETCHED_AT = 1000;

interface Options {
  readonly cacheForMs?: number;
  readonly script?: Omit<UpstreamScript, "seed">;
  readonly store?: KeyValueStore;
}

export const opened = (options: Options = {}) => {
  const clock = { at: FETCHED_AT };
  const upstream = fakeUpstream({ seed: 4, ...options.script });
  const source = openSource({
    fetch: upstream,
    now: () => clock.at,
    wait: () => Promise.resolve(),
    random: () => 0.5,
  });
  return {
    clock,
    source,
    resolve: openCatalogue({
      source,
      store: options.store ?? inMemoryStore(),
      now: () => clock.at,
      cacheForMs: options.cacheForMs,
    }),
    listings: () =>
      upstream.requests.filter((request) => request.path.startsWith(LISTINGS))
        .length,
  };
};

export const answering = (value: unknown): KeyValueStore => ({
  read: async () => value,
  write: async () => undefined,
});

export const payloadOf = <Found>(reading: Reading<Found>): Found => {
  if (!reading.ok) throw new Error(`the catalogue answered ${reading.reason}`);
  return reading.payload;
};

export const counted = (reading: Reading<Catalogue>) => {
  const catalogue = payloadOf(reading);
  return {
    bookable: catalogue.bookable.length,
    unbookable: catalogue.unbookable.length,
    unidentified: catalogue.unidentified.length,
  };
};
