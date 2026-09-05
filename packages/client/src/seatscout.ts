import { openSource, type SourceDependencies } from "@seatscout/core";
import { openProgramme } from "./programme.js";
import { openSearch } from "./search.js";
import { inMemoryStore, type KeyValueStore } from "./store.js";
import { openVerification } from "./verify.js";

export interface SeatScoutDependencies extends SourceDependencies {
  readonly store?: KeyValueStore;
}

export const createSeatScout = (deps: SeatScoutDependencies) => {
  const catalogue = {
    source: openSource(deps),
    store: deps.store ?? inMemoryStore(),
    now: deps.now,
  };
  return {
    programme: openProgramme({ ...catalogue, source: openSource(deps) }),
    search: openSearch(catalogue),
    verify: openVerification(catalogue),
  };
};

export type SeatScout = ReturnType<typeof createSeatScout>;
