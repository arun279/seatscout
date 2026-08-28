import type { Catalogue } from "@seatscout/core";

export interface CachedCatalogue {
  readonly fetchedAt: number;
  readonly catalogue: Catalogue;
}

export interface KeyValueStore {
  readonly read: (key: string) => Promise<unknown>;
  readonly write: (key: string, value: CachedCatalogue) => Promise<void>;
}

export const inMemoryStore = (): KeyValueStore => {
  const held = new Map<string, CachedCatalogue>();
  return {
    read: async (key) => {
      const value = held.get(key);
      return value === undefined ? null : value;
    },
    write: async (key, value) => {
      held.set(key, value);
    },
  };
};
