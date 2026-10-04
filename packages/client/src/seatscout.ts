import { openSource, type SourceDependencies } from "@seatscout/core";
import { openCooldown } from "./cooldown.js";
import { SOURCE_LIMITS, type SourceLimits } from "./limits.js";
import { openProfile } from "./profile.js";
import { openProgramme } from "./programme.js";
import { openRecentSearches } from "./recent.js";
import { openSearch } from "./search.js";
import { inMemoryStore, type KeyValueStore } from "./store.js";
import { openVerification } from "./verify.js";

export interface SeatScoutDependencies
  extends Omit<SourceDependencies, "policy"> {
  readonly store?: KeyValueStore;
  readonly limits?: SourceLimits;
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
  const limits = deps.limits ?? SOURCE_LIMITS;
  const cooldown = openCooldown({
    store,
    now: deps.now,
    lastsMs: limits.refusalCooldownMs,
  });
  const opened = () =>
    cooldown.guarded(openSource({ ...deps, policy: limits }));
  const catalogue = { source: opened(), store, now: deps.now, limits };
  return {
    programme: openProgramme({ ...catalogue, source: opened() }),
    search: openSearch({ ...catalogue, cooldown }),
    verify: openVerification(catalogue),
    profile: openProfile(store),
    recent: openRecentSearches(store),
  };
};
