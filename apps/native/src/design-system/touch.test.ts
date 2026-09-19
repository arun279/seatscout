import { describe, expect, it } from "@jest/globals";
import { floorFor } from "./touch.js";

describe("the floor a control has to reach", () => {
  it("is Apple's own default control size on iOS", () => {
    expect(floorFor("ios")).toBe(44);
  });

  it("is Google's own touch target on Android, which is higher", () => {
    expect(floorFor("android")).toBe(48);
  });

  it("takes the higher of the two where the platform is neither", () => {
    expect(floorFor("web")).toBe(48);
  });
});
