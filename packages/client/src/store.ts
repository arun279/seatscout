import type { Catalogue, SeatProfile } from "@seatscout/core";
import type { Programme } from "./programme.js";

export interface CachedCatalogue {
  readonly fetchedAt: number;
  readonly catalogue: Catalogue;
}

export interface CachedProgramme {
  readonly fetchedAt: number;
  readonly programme: Programme;
}

export interface RecentSearch {
  readonly movie: string;
  readonly date: string;
  readonly area: string;
  readonly partySize: number;
}

export interface Remembered {
  readonly listing: CachedCatalogue;
  readonly programme: CachedProgramme;
  readonly profile: SeatProfile;
  readonly recent: readonly RecentSearch[];
}

export type Stored = Remembered[keyof Remembered];

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
