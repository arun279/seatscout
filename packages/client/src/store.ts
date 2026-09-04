import type { Catalogue } from "@seatscout/core";
import type { Programme } from "./programme.js";

export interface CachedCatalogue {
  readonly fetchedAt: number;
  readonly catalogue: Catalogue;
}

export interface CachedProgramme {
  readonly fetchedAt: number;
  readonly programme: Programme;
}

export type Cached = CachedCatalogue | CachedProgramme;

export interface KeyValueStore {
  readonly read: (key: string) => Promise<unknown>;
  readonly write: (key: string, value: Cached) => Promise<void>;
}

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
