import { type KeyValueStore, inMemoryStore } from "@seatscout/client";

interface WebStorage {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
}

const attempted = <Value>(act: () => Value): Value | undefined => {
  try {
    return act();
  } catch {}
};

const storeOver = (storage: WebStorage): KeyValueStore => ({
  read: async (key) => {
    const text = storage.getItem(key);
    return text === null ? undefined : attempted(() => JSON.parse(text));
  },
  write: async (key, value) => {
    attempted(() => storage.setItem(key, JSON.stringify(value)));
  },
});

export const browserStore = (
  open: () => WebStorage = () => localStorage,
): KeyValueStore => {
  const storage = attempted(open);
  return storage === undefined ? inMemoryStore() : storeOver(storage);
};
