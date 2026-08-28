import type { KeyValueStore } from "@seatscout/client";

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

const heldForTheSession = (): WebStorage => {
  const held = new Map<string, string>();
  return {
    getItem: (key) => {
      const text = held.get(key);
      return text === undefined ? null : text;
    },
    setItem: (key, value) => {
      held.set(key, value);
    },
  };
};

export const browserStore = (
  open: () => WebStorage = () => localStorage,
): KeyValueStore => {
  const reached = attempted(open);
  const storage = reached === null ? heldForTheSession() : reached;
  return {
    read: async (key) =>
      attempted(() => JSON.parse(String(storage.getItem(key)))),
    write: async (key, value) => {
      attempted(() => storage.setItem(key, JSON.stringify(value)));
    },
  };
};
