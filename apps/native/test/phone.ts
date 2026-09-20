import {
  createSeatScout,
  type KeyValueStore,
  type RecentSearch,
  type SeatScout,
} from "@seatscout/client";

export interface Phone {
  readonly seatscout: SeatScout;
  readonly reads: readonly string[];
}

const heldBy = (remembered: readonly RecentSearch[]): KeyValueStore => {
  const kept = new Map<string, unknown>([["seatscout.recent.v1", remembered]]);
  return {
    read: (key) => Promise.resolve(kept.get(key)),
    write: (key, value) => {
      kept.set(key, value);
      return Promise.resolve();
    },
  };
};

export const phone = (remembered: readonly RecentSearch[] = []): Phone => {
  const reads: string[] = [];
  return {
    reads,
    seatscout: createSeatScout({
      fetch: (url) => {
        reads.push(url);
        return Promise.reject(new Error(`nothing should be read: ${url}`));
      },
      now: () => 1_789_000_000_000,
      wait: () => Promise.resolve(),
      random: () => 0,
      store: heldBy(remembered),
    }),
  };
};
