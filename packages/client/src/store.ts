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
