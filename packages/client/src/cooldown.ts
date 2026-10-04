import type { Reading, Source } from "@seatscout/core";
import type { KeyValueStore } from "./store.js";

const KEY = "seatscout.cooldown.v1";

export interface CooldownDependencies {
  readonly store: KeyValueStore;
  readonly now: () => number;
  readonly lastsMs: number;
}

export interface Cooldown {
  readonly guarded: (source: Source) => Source;
  readonly until: () => number;
}

export const openCooldown = (deps: CooldownDependencies): Cooldown => {
  let until = 0;
  const recalled = deps.store.read(KEY).then((held) => {
    if (typeof held === "number") until = held;
  });

  const through = async <Payload>(
    read: () => Promise<Reading<Payload>>,
  ): Promise<Reading<Payload>> => {
    await recalled;
    if (deps.now() < until)
      return {
        ok: false,
        reason: "refused",
        fetchedAt: deps.now(),
        attempts: 0,
      };
    const reading = await read();
    if (!reading.ok && reading.reason === "refused") {
      until = deps.now() + deps.lastsMs;
      await deps.store.write(KEY, until);
    }
    return reading;
  };

  return {
    guarded: (source) => ({
      theatersNear: (area) => through(() => source.theatersNear(area)),
      moviesAt: (theater, date) =>
        through(() => source.moviesAt(theater, date)),
      showtimesFor: (movie, date, area) =>
        through(() => source.showtimesFor(movie, date, area)),
      seatsFor: (showtime) => through(() => source.seatsFor(showtime)),
    }),
    until: () => until,
  };
};
