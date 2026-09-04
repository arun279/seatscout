import type { Catalogue, SeatProfile } from "@seatscout/core";

export interface CachedCatalogue {
  readonly fetchedAt: number;
  readonly catalogue: Catalogue;
}

export interface RecentSearch {
  readonly movie: string;
  readonly date: string;
  readonly area: string;
  readonly partySize: number;
}

export type Stored = CachedCatalogue | SeatProfile | readonly RecentSearch[];

export interface KeyValueStore {
  readonly read: (key: string) => Promise<unknown>;
  readonly write: (key: string, value: Stored) => Promise<void>;
}

export const isRecord = (
  value: unknown,
): value is Readonly<Record<string, unknown>> => value instanceof Object;

export const inMemoryStore = (): KeyValueStore => {
  const held = new Map<string, string>();
  return {
    read: async (key) => {
      const text = held.get(key);
      return text === undefined ? undefined : JSON.parse(text);
    },
    write: async (key, value) => {
      held.set(key, JSON.stringify(value));
    },
  };
};
