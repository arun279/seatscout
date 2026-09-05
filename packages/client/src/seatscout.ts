import { openSource, type SourceDependencies } from "@seatscout/core";
import { openProfile } from "./profile.js";
import { openRecentSearches } from "./recent.js";
import { openSearch } from "./search.js";
import { inMemoryStore, type KeyValueStore } from "./store.js";
import { openVerification } from "./verify.js";

export interface SeatScoutDependencies extends SourceDependencies {
  readonly store?: KeyValueStore;
}

export const createSeatScout = (deps: SeatScoutDependencies) => {
  const store = deps.store ?? inMemoryStore();
  const catalogue = { source: openSource(deps), store, now: deps.now };
  return {
    search: openSearch(catalogue),
    verify: openVerification(catalogue),
    profile: openProfile(store),
    recent: openRecentSearches(store),
  };
};

export type SeatScout = ReturnType<typeof createSeatScout>;
