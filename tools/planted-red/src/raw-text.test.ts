import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { lintedInApp, said } from "./planted.fixtures.ts";

const REFUSAL = "Draw words through Type and fields through Field";

const drawn = (named: string) => lintedInApp("raw-text", named);

describe("the planted red under the rule that every word is drawn through Type or Field", () => {
  for (const [written, named] of [
    ["React Native's Text", "text.tsx"],
    ["React Native's TextInput", "text-input.tsx"],
    ["Text under another name", "renamed.tsx"],
    ["Text read from the whole module", "namespace.tsx"],
    ["React Native's Animated.Text", "animated.tsx"],
    ["Reanimated's Animated.Text", "reanimated.tsx"],
    ["the gesture handler's Text", "gesture-handler.tsx"],
    ["Text passed on by an export", "re-exported.tsx"],
    ["React Native's Button, which draws its own title", "button.tsx"],
  ])
    it(`refuses ${written}`, () => {
      const run = drawn(named ?? "");

      expect(run.status).toBe(1);
      expect(said(run)).toContain(REFUSAL);
    });

  for (const [written, named] of [
    ["Text named only as a type", "type-import.tsx"],
    ["TextInput named as a type beside a value", "type-beside-a-value.tsx"],
    ["other members of the module and of Animated", "other-members.tsx"],
  ])
    it(`passes ${written}`, () => {
      const run = drawn(named ?? "");

      expect(run.status).toBe(0);
      expect(said(run)).not.toContain(REFUSAL);
    });
});

const fromTheApp = createRequire(
  new URL("../../../apps/native/package.json", import.meta.url),
);

const installed = (name: string): readonly number[] => {
  const manifest: unknown = fromTheApp(`${name}/package.json`);
  return typeof manifest === "object" &&
    manifest !== null &&
    "version" in manifest &&
    typeof manifest.version === "string"
    ? manifest.version.split(".").map(Number)
    : [];
};

describe("the text-size remount and the rule that keeps it whole", () => {
  it("are needed only before React Native 0.87, which measures text again after a text size change", () => {
    const [major, minor] = installed("react-native");

    expect(
      major === 0 && minor !== undefined && minor < 87,
      "React Native 0.87 is installed: remove the text-size remount and the no-raw-text rule",
    ).toBe(true);
  });
});
