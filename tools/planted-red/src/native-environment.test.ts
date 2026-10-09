import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const fromTheApp = createRequire(
  new URL("../../../apps/native/package.json", import.meta.url),
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
  readonly test?: { mode?: string; readonly errors: readonly unknown[] };
}

interface State {
  readonly unhandledErrors: unknown[];
}

const stop: unknown = fromTheApp("./test/stop-at-first-failure.cjs");

const stopAtFirstFailure = (
  event: Event,
  mutant: string | undefined,
  state: State = { unhandledErrors: [] },
): void => {
  if (typeof stop !== "function")
    throw new Error("stop-at-first-failure.cjs exports no function");
  stop(event, state, mutant);
};

const started = (mutant: string | undefined): string | undefined => {
  const test: { mode?: string; errors: readonly unknown[] } = { errors: [] };
  stopAtFirstFailure({ name: "test_start", test }, mutant);
  return test.mode;
};

const done = (mutant: string | undefined, errors: readonly unknown[]) =>
  stopAtFirstFailure({ name: "test_done", test: { errors } }, mutant);

const leftOutsideATest = (mutant: string | undefined): readonly unknown[] => {
  const state: State = { unhandledErrors: [new Error("thrown after a test")] };
  stopAtFirstFailure({ name: "run_finish" }, mutant, state);
  return state.unhandledErrors;
};

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

  it("drops a test file's errors outside any test once the mutant is killed, so a killed mutant is not scored a runtime error", () => {
    done("5", [new Error("killed")]);

    expect(leftOutsideATest("5")).toEqual([]);
  });

  it("keeps errors outside any test while no test has failed under the mutant, so an error that judged nothing is still refused", () => {
    done("6", []);

    expect(leftOutsideATest("6")).toHaveLength(1);
  });

  it("never skips outside a mutant's run, so the dry run and a plain run see every failure", () => {
    done(undefined, [new Error("failed")]);

    expect(started(undefined)).toBeUndefined();
    expect(leftOutsideATest(undefined)).toHaveLength(1);
  });
});
