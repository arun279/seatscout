import type { KeyValueStore } from "@seatscout/client";

interface WebStorage {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
}

interface SessionStore {
  readonly read: () => Promise<string | undefined>;
  readonly write: (session: string) => Promise<void>;
}

const SESSION = "session";

const attempted = <Value>(act: () => Value): Value | undefined => {
  try {
    return act();
  } catch {}
};

const heldInMemory = (): WebStorage => {
  const held = new Map<string, string>();
  return {
    getItem: (key) => held.get(key) ?? null,
    setItem: (key, value) => {
      held.set(key, value);
    },
  };
};

const deviceStorage = (open: () => WebStorage) =>
  attempted(open) ?? heldInMemory();

const storeOver = (storage: WebStorage): KeyValueStore => ({
  read: async (key) => {
    const text = storage.getItem(key);
    return text === null ? undefined : attempted(() => JSON.parse(text));
  },
  write: async (key, value) => {
    attempted(() => storage.setItem(key, JSON.stringify(value)));
  },
});

const sessionOver = (storage: WebStorage): SessionStore => ({
  read: async () => storage.getItem(SESSION) ?? undefined,
  write: async (session) => {
    attempted(() => storage.setItem(SESSION, session));
  },
});

export const browserStore = (
  open: () => WebStorage = () => localStorage,
): KeyValueStore => storeOver(deviceStorage(open));

export const browserSession = (
  open: () => WebStorage = () => localStorage,
): SessionStore => sessionOver(deviceStorage(open));
