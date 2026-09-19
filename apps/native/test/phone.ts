import {
  createSeatScout,
  type KeyValueStore,
  type Programme,
  type RecentSearch,
  type SeatScout,
  type Theater,
} from "@seatscout/client";
import { termsOf } from "@seatscout/view-logic";

export interface Playing {
  readonly area: string;
  readonly date: string;
  readonly programme: Programme;
}

export interface Phone {
  readonly seatscout: SeatScout;
  readonly reads: readonly string[];
}

const NOW = 1_789_000_000_000;

export const nearby = (id: string, name: string): readonly Theater[] =>
  (termsOf({ theaters: [id] }, "2026-09-19").theaters ?? []).map((held) => ({
    id: held,
    name,
  }));

const heldBy = (
  remembered: readonly RecentSearch[],
  playing: Playing | undefined,
): KeyValueStore => {
  const kept = new Map<string, unknown>([["seatscout.recent.v1", remembered]]);
  if (playing !== undefined)
    kept.set(
      `seatscout.programme.v1.${JSON.stringify([playing.date, playing.area])}`,
      { fetchedAt: NOW, programme: playing.programme },
    );
  return {
    read: (key) => Promise.resolve(kept.get(key)),
    write: (key, value) => {
      kept.set(key, value);
      return Promise.resolve();
    },
  };
};

export const phone = (
  remembered: readonly RecentSearch[] = [],
  playing?: Playing,
): Phone => {
  const reads: string[] = [];
  return {
    reads,
    seatscout: createSeatScout({
      fetch: (url) => {
        reads.push(url);
        return Promise.reject(new Error(`nothing should be read: ${url}`));
      },
      now: () => NOW,
      wait: () => Promise.resolve(),
      random: () => 0,
      store: heldBy(remembered, playing),
    }),
  };
};
