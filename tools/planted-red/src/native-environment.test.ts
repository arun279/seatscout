import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const fromTheApp = createRequire(
  new URL("../../../apps/native/package.json", import.meta.url),
);

const fromTheRoot = createRequire(
  new URL("../../../package.json", import.meta.url),
);

const environmentOf = (preset: string): unknown => {
  const loaded: unknown = fromTheApp(`jest-expo/${preset}/jest-preset`);
  return typeof loaded === "object" &&
    loaded !== null &&
    "testEnvironment" in loaded
    ? loaded.testEnvironment
    : undefined;
};

describe("the environment the app's tests run in", () => {
  it("is the one both platform presets name, so one marked environment serves both", () => {
    expect(environmentOf("android")).toEqual(expect.any(String));
    expect(environmentOf("android")).toBe(environmentOf("ios"));
  });
});

interface Event {
  readonly name: string;
  readonly test: { mode?: string; readonly errors: readonly unknown[] };
}

const stop: unknown = fromTheApp("./test/stop-at-first-failure.cjs");

const stopAtFirstFailure = (event: Event, mutant: string | undefined): void => {
  if (typeof stop !== "function")
    throw new Error("stop-at-first-failure.cjs exports no function");
  stop(event, mutant);
};

const started = (mutant: string | undefined): string | undefined => {
  const event: Event = { name: "test_start", test: { errors: [] } };
  stopAtFirstFailure(event, mutant);
  return event.test.mode;
};

const done = (mutant: string | undefined, errors: readonly unknown[]) =>
  stopAtFirstFailure({ name: "test_done", test: { errors } }, mutant);

describe("a mutant's run, which Stryker cannot stop at its first failure", () => {
  it("skips every later test once one test has failed under the mutant", () => {
    done("1", [new Error("killed")]);

    expect([started("1"), started("1")]).toEqual(["skip", "skip"]);
  });

  it("runs every test while each one passes, so a survivor is judged by all of them", () => {
    done("2", []);

    expect(started("2")).toBeUndefined();
  });

  it("starts afresh under the next mutant", () => {
    done("3", [new Error("killed")]);

    expect([started("3"), started("4"), started("4")]).toEqual([
      "skip",
      undefined,
      undefined,
    ]);
  });

  it("never skips outside a mutant's run, so the dry run and a plain run see every failure", () => {
    done(undefined, [new Error("failed")]);

    expect(started(undefined)).toBeUndefined();
  });
});

interface Instrumenter {
  instrument(
    files: readonly { name: string; content: string; mutate: boolean }[],
    options: {
      plugins: null;
      excludedMutations: readonly string[];
      ignorers: readonly string[];
    },
  ): Promise<{ readonly files: readonly { readonly content: string }[] }>;
}

const {
  Instrumenter,
}: { readonly Instrumenter: new (logger: object) => Instrumenter } =
  fromTheRoot("@stryker-mutator/instrumenter");

const QUIET = {
  debug: () => undefined,
  info: () => undefined,
  isDebugEnabled: () => false,
  warn: () => undefined,
};

const hold: unknown = fromTheApp("./test/hold-coverage.cjs");

const held = (stryker: object): void => {
  if (typeof hold !== "function")
    throw new Error("hold-coverage.cjs exports no function");
  hold(stryker);
};

const countedInATestFile = async (stryker: object): Promise<void> => {
  const [mutated] = (
    await new Instrumenter(QUIET).instrument(
      [{ name: "hit.js", content: "globalThis.hit = 1 + 1;", mutate: true }],
      { plugins: null, excludedMutations: [], ignorers: [] },
    )
  ).files;
  runInNewContext(mutated?.content ?? "", { __stryker__: stryker });
};

interface Stryker {
  readonly currentTestId: string;
  readonly mutantCoverage?: { readonly perTest: Record<string, object> };
}

const perTest = (stryker: Stryker) =>
  stryker.mutantCoverage?.perTest[stryker.currentTestId];

describe("the coverage Stryker counts while a test file runs", () => {
  it("is kept in objects made outside the test file, so a finished file's realm can be freed", async () => {
    const stryker: Stryker = { currentTestId: "a test" };
    held(stryker);

    await countedInATestFile(stryker);

    expect(perTest(stryker)).toEqual({ "0": 1 });
    expect(Object.getPrototypeOf(perTest(stryker))).toBe(Object.prototype);
  });

  it("is otherwise made inside the test file, which then stays in memory until the dry run ends", async () => {
    const stryker: Stryker = { currentTestId: "a test" };

    await countedInATestFile(stryker);

    expect(
      Object.getPrototypeOf(perTest(stryker)),
      "Stryker now makes its coverage objects outside the test file: remove hold-coverage.cjs",
    ).not.toBe(Object.prototype);
  });
});
