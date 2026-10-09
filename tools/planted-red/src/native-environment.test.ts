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
