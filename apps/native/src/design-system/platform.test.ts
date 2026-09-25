import { describe, expect, it } from "@jest/globals";
import { Platform } from "react-native";
import { isAndroid, ON_ANDROID } from "./platform.js";

describe("which platform the design system is drawing on", () => {
  it("is Android only on Android", () => {
    expect(isAndroid("android")).toBe(true);
    expect(isAndroid("ios")).toBe(false);
    expect(isAndroid("web")).toBe(false);
  });

  it("answers for the platform this app is running on", () => {
    expect(ON_ANDROID).toBe(Platform.OS === "android");
  });
});
