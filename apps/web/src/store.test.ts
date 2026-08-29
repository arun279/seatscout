import { type CachedCatalogue, storeContract } from "@seatscout/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { browserSession, browserStore } from "./store.js";

const REMEMBERED: CachedCatalogue = {
  fetchedAt: 1,
  catalogue: { bookable: [], unbookable: [], unidentified: [] },
};

const REMEMBERED_TEXT =
  '{"fetchedAt":1,"catalogue":{"bookable":[],"unbookable":[],"unidentified":[]}}';

const webStorage = () => {
  const held = new Map<string, string>();
  return {
    held,
    getItem: (key: string) => {
      const text = held.get(key);
      return text === undefined ? null : text;
    },
    setItem: (key: string, value: string) => {
      held.set(key, value);
    },
  };
};

const failing = async (store: ReturnType<typeof browserStore>) =>
  (await storeContract(store))
    .filter((check) => check.failure !== null)
    .map((check) => check.failure);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the browser store", () => {
  it("satisfies the store contract against Web Storage, and writes through to it", async () => {
    const storage = webStorage();

    expect(await failing(browserStore(() => storage))).toEqual([]);
    expect(storage.held.get("written")).toBe(REMEMBERED_TEXT);
  });

  it("reaches the browser's own Web Storage when it is given no other", async () => {
    const storage = webStorage();
    vi.stubGlobal("localStorage", storage);
    await browserStore().write("written", REMEMBERED);

    expect(storage.held.get("written")).toBe(REMEMBERED_TEXT);
  });

  it("satisfies the same contract where storage is refused", async () => {
    expect(
      await failing(
        browserStore(() => {
          throw new Error("storage is disabled");
        }),
      ),
    ).toEqual([]);
  });

  it("satisfies the same contract where there is no Web Storage at all", async () => {
    expect(await failing(browserStore())).toEqual([]);
  });

  it("drops a write the storage refuses and keeps answering", async () => {
    const storage = webStorage();
    let full = false;
    const store = browserStore(() => ({
      getItem: storage.getItem,
      setItem: (key: string, value: string) => {
        if (full) throw new Error("the quota is exhausted");
        storage.setItem(key, value);
      },
    }));
    await store.write("held", REMEMBERED);
    full = true;
    await store.write("held", { ...REMEMBERED, fetchedAt: 2 });

    expect(await store.read("held")).toEqual(REMEMBERED);
  });

  it("reads a key the storage answers with something other than a value as absent", async () => {
    const storage = webStorage();
    const store = browserStore(() => storage);
    storage.setItem("mangled", "half a catalo");

    expect(await store.read("mangled")).toBeUndefined();
  });
});

describe("the browser session", () => {
  it("reads back the session it was given, under a key of its own", async () => {
    const storage = webStorage();
    const session = browserSession(() => storage);
    await session.write("AKA_SESSION=held");

    expect(await session.read()).toBe("AKA_SESSION=held");
    expect(storage.held.get("session")).toBe("AKA_SESSION=held");
  });

  it("reads a device holding no session as holding none", async () => {
    expect(await browserSession(webStorage).read()).toBeUndefined();
  });

  it("reaches the browser's own Web Storage when it is given no other", async () => {
    const storage = webStorage();
    vi.stubGlobal("localStorage", storage);
    await browserSession().write("AKA_SESSION=held");

    expect(storage.held.get("session")).toBe("AKA_SESSION=held");
  });

  it("keeps answering where storage is refused, for as long as the accessor lives", async () => {
    const session = browserSession(() => {
      throw new Error("storage is disabled");
    });
    await session.write("AKA_SESSION=held");

    expect(await session.read()).toBe("AKA_SESSION=held");
  });

  it("drops a write the storage refuses and keeps answering", async () => {
    const storage = webStorage();
    let full = false;
    const session = browserSession(() => ({
      getItem: storage.getItem,
      setItem: (key: string, value: string) => {
        if (full) throw new Error("the quota is exhausted");
        storage.setItem(key, value);
      },
    }));
    await session.write("AKA_SESSION=held");
    full = true;
    await session.write("AKA_SESSION=replaced");

    expect(await session.read()).toBe("AKA_SESSION=held");
  });
});
