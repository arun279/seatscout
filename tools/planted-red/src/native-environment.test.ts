import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const fromTheApp = createRequire(
  new URL("../../../apps/native/package.json", import.meta.url),
);

const environmentOf = (preset: string): unknown =>
  fromTheApp(`jest-expo/${preset}/jest-preset`).testEnvironment;

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

const stopAtFirstFailure: (event: Event, mutant: string | undefined) => void =
  fromTheApp("./test/stop-at-first-failure.cjs");

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

    expect(started("4")).toBeUndefined();
  });

  it("never skips outside a mutant's run, so the dry run and a plain run see every failure", () => {
    done(undefined, [new Error("failed")]);

    expect(started(undefined)).toBeUndefined();
  });
});
