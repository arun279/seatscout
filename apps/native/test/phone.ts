import {
  createSeatScout,
  type KeyValueStore,
  type Programme,
  type RecentSearch,
  type SeatScout,
  type Theater,
} from "@seatscout/client";
import { fakeUpstream, type UpstreamScript } from "@seatscout/client/testing";
import { termsOf } from "@seatscout/view-logic";

export interface Playing {
  readonly area: string;
  readonly date: string;
  readonly programme: Programme;
}

export type Fetch = Parameters<typeof createSeatScout>[0]["fetch"];

export interface Upstream {
  readonly script?: Omit<UpstreamScript, "seed"> | undefined;
  readonly through?: ((upstream: Fetch) => Fetch) | undefined;
  readonly playing?: Playing | undefined;
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
  const kept = new Map<string, unknown>([["seatscout.recent.v2", remembered]]);
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

const reaching = (upstream: Upstream): Fetch => {
  if (upstream.script === undefined)
    return (url) => Promise.reject(new Error(`nothing should be read: ${url}`));
  return fakeUpstream({
    seed: 4,
    standInAuditoriums: true,
    standInTheaters: true,
    ...upstream.script,
  });
};

export const phone = (
  remembered: readonly RecentSearch[] = [],
  given: Upstream = {},
): Phone => {
  const reads: string[] = [];
  const upstream = reaching(given);
  const send = given.through === undefined ? upstream : given.through(upstream);
  return {
    reads,
    seatscout: createSeatScout({
      fetch: (url, init) => {
        reads.push(url);
        return send(url, init);
      },
      now: () => NOW,
      wait: () => Promise.resolve(),
      random: () => 0,
      store: heldBy(remembered, given.playing),
    }),
  };
};
