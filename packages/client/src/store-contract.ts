import type { CachedCatalogue, KeyValueStore } from "./store.js";

export interface ContractCheck {
  readonly name: string;
  readonly failure: string | null;
}

interface Sample {
  readonly value: CachedCatalogue;
  readonly text: string;
}

interface Clause {
  readonly name: string;
  readonly run: (store: KeyValueStore) => Promise<string | null>;
}

const ABSENT = "null";

const AWKWARD_KEY = 'a "quoted" \\ key with a ☃ in it';

const sample = (fetchedAt: number): Sample => ({
  value: { fetchedAt, catalogue: { bookable: [], unbookable: [] } },
  text: `{"fetchedAt":${fetchedAt},"catalogue":{"bookable":[],"unbookable":[]}}`,
});

const reads = async (store: KeyValueStore, key: string, expected: string) => {
  const got = JSON.stringify(await store.read(key));
  return got === expected ? null : `${key} read ${got} rather than ${expected}`;
};

const wrote = async (store: KeyValueStore, key: string, item: Sample) => {
  await store.write(key, item.value);
  return reads(store, key, item.text);
};

const CLAUSES: readonly Clause[] = [
  {
    name: "a key that was never written reads as absent",
    run: (store) => reads(store, "unwritten", ABSENT),
  },
  {
    name: "a written value reads back unchanged",
    run: (store) => wrote(store, "written", sample(1)),
  },
  {
    name: "a later write replaces the earlier one",
    run: async (store) => {
      await store.write("replaced", sample(2).value);
      return wrote(store, "replaced", sample(3));
    },
  },
  {
    name: "one key does not disturb another",
    run: async (store) => {
      await store.write("undisturbed", sample(4).value);
      await store.write("disturbing", sample(5).value);
      return reads(store, "undisturbed", sample(4).text);
    },
  },
  {
    name: "a key carrying quotes, a backslash and a snowman is a key like any other",
    run: (store) => wrote(store, AWKWARD_KEY, sample(6)),
  },
];

export const storeContract = async (
  store: KeyValueStore,
): Promise<readonly ContractCheck[]> => {
  const checks: ContractCheck[] = [];
  for (const clause of CLAUSES)
    checks.push({ name: clause.name, failure: await clause.run(store) });
  return checks;
};
