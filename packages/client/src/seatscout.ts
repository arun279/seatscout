import { openSource } from "@seatscout/core";
import type { SourceDependencies } from "@seatscout/core";
import { openProfile } from "./profile.js";
import { openProgramme } from "./programme.js";
import { openRecentSearches } from "./recent.js";
import { openSearch } from "./search.js";
import { inMemoryStore, type KeyValueStore } from "./store.js";
import { openVerification } from "./verify.js";

export interface SeatScoutDependencies extends SourceDependencies {
  readonly store?: KeyValueStore;
}

export interface SeatScout {
  readonly programme: ReturnType<typeof openProgramme>;
  readonly search: ReturnType<typeof openSearch>;
  readonly verify: ReturnType<typeof openVerification>;
  readonly profile: ReturnType<typeof openProfile>;
  readonly recent: ReturnType<typeof openRecentSearches>;
}

export const createSeatScout = (deps: SeatScoutDependencies): SeatScout => {
  const store = deps.store ?? inMemoryStore();
  const catalogue = { source: openSource(deps), store, now: deps.now };
  return {
    programme: openProgramme({ ...catalogue, source: openSource(deps) }),
    search: openSearch(catalogue),
    verify: openVerification(catalogue),
    profile: openProfile(store),
    recent: openRecentSearches(store),
  };
};
