import { type CachedCatalogue, storeContract } from "@seatscout/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { browserStore } from "./store.js";

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
