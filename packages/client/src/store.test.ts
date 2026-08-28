import { describe, expect, it } from "vitest";
import { type ContractCheck, storeContract } from "./store-contract.js";
import {
  type CachedCatalogue,
  type KeyValueStore,
  inMemoryStore,
} from "./store.js";

const NAMES = [
  "a key that was never written reads as absent",
  "a written value reads back unchanged",
  "a later write replaces the earlier one",
  "one key does not disturb another",
  "what is read back is the store's own value, not the caller's object",
  "a key carrying quotes, a backslash and a snowman is a key like any other",
];

const AWKWARD_KEY = 'a "quoted" \\ key with a ☃ in it';

const EMPTY: CachedCatalogue = {
  fetchedAt: 0,
  catalogue: { bookable: [], unbookable: [] },
};

const failing = (checks: readonly ContractCheck[]) =>
  checks.filter((check) => check.failure !== null).map((check) => check.name);

const forgetful = (): KeyValueStore => ({
  read: async () => undefined,
  write: async () => undefined,
});

const optimistic = (): KeyValueStore => {
  const held = inMemoryStore();
  return {
    read: async (key) => {
      const value = await held.read(key);
      return value === undefined ? EMPTY : value;
    },
    write: held.write,
  };
};

const writeOnce = (): KeyValueStore => {
  const held = new Map<string, string>();
  return {
    read: async (key) => {
      const text = held.get(key);
      return text === undefined ? undefined : JSON.parse(text);
    },
    write: async (key, value) => {
      if (!held.has(key)) held.set(key, JSON.stringify(value));
    },
  };
};

const oneSlot = (): KeyValueStore => {
  let held: string | undefined;
  return {
    read: async () => (held === undefined ? undefined : JSON.parse(held)),
    write: async (_key, value) => {
      held = JSON.stringify(value);
    },
  };
};

const byReference = (): KeyValueStore => {
  const held = new Map<string, CachedCatalogue>();
  return {
    read: async (key) => held.get(key),
    write: async (key, value) => {
      held.set(key, value);
    },
  };
};

describe("the key-value store contract", () => {
  it("is satisfied by the in-memory store", async () => {
    expect(await storeContract(inMemoryStore())).toEqual(
      NAMES.map((name) => ({ name, failure: null })),
    );
  });

  it("exercises the store with the keys and the operations it names", async () => {
    const held = inMemoryStore();
    const log: string[] = [];
    const watched: KeyValueStore = {
      read: (key) => {
        log.push(`read ${key}`);
        return held.read(key);
      },
      write: (key, value) => {
        log.push(`write ${key}`);
        return held.write(key, value);
      },
    };

    expect(failing(await storeContract(watched))).toEqual([]);
    expect(log).toEqual([
      "read unwritten",
      "write written",
      "read written",
      "write replaced",
      "write replaced",
      "read replaced",
      "write undisturbed",
      "write disturbing",
      "read undisturbed",
      "write copied",
      "read copied",
      "read copied",
      `write ${AWKWARD_KEY}`,
      `read ${AWKWARD_KEY}`,
    ]);
  });

  it("fails exactly the clause each broken store breaks", async () => {
    const broken = [
      ["answering a key it was never given", optimistic],
      ["forgetting what it was told", forgetful],
      ["refusing to replace a value", writeOnce],
      ["keeping one value for every key", oneSlot],
      ["handing back the object it was given", byReference],
    ] as const;
    const found: (readonly [string, readonly string[]])[] = [];
    for (const [fault, open] of broken)
      found.push([fault, failing(await storeContract(open()))]);

    expect(found).toEqual([
      ["answering a key it was never given", [NAMES[0]]],
      [
        "forgetting what it was told",
        [NAMES[1], NAMES[2], NAMES[3], NAMES[4], NAMES[5]],
      ],
      ["refusing to replace a value", [NAMES[2]]],
      ["keeping one value for every key", [NAMES[3]]],
      ["handing back the object it was given", [NAMES[4]]],
    ]);
  });

  it("says which key answered what, and what it should have answered", async () => {
    const invented = await storeContract(optimistic());
    const checks = await storeContract(forgetful());

    expect(invented[0]?.failure).toBe(
      'unwritten read {"fetchedAt":0,"catalogue":{"bookable":[],"unbookable":[]}} rather than nothing',
    );
    expect(checks.map((check) => check.failure)).toEqual([
      null,
      'written read undefined rather than {"fetchedAt":1,"catalogue":{"bookable":[],"unbookable":[]}}',
      'replaced read undefined rather than {"fetchedAt":3,"catalogue":{"bookable":[],"unbookable":[]}}',
      'undisturbed read undefined rather than {"fetchedAt":4,"catalogue":{"bookable":[],"unbookable":[]}}',
      'copied read undefined rather than {"fetchedAt":6,"catalogue":{"bookable":[],"unbookable":[]}}',
      `${AWKWARD_KEY} read undefined rather than {"fetchedAt":7,"catalogue":{"bookable":[],"unbookable":[]}}`,
    ]);
  });

  it("says when a store hands back the caller's own object", async () => {
    const checks = await storeContract(byReference());

    expect(checks[4]).toEqual({
      name: NAMES[4],
      failure: "copied read back the very object it was given",
    });
  });
});
