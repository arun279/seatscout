import { type KeyValueStore, inMemoryStore } from "@seatscout/client";

interface WebStorage {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
}

const attempted = <Value>(act: () => Value): Value | null => {
  try {
    return act();
  } catch {
    return null;
  }
};

const storeOver = (storage: WebStorage): KeyValueStore => ({
  read: async (key) =>
    attempted(() => JSON.parse(String(storage.getItem(key)))),
  write: async (key, value) => {
    attempted(() => storage.setItem(key, JSON.stringify(value)));
  },
});

export const browserStore = (
  open: () => WebStorage = () => localStorage,
): KeyValueStore => {
  const storage = attempted(open);
  return storage === null ? inMemoryStore() : storeOver(storage);
};
