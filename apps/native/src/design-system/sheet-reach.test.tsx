import { describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { AccessibilityInfo, type Text } from "react-native";
import { headingReachFor } from "./sheet.js";
import { Type } from "./type.js";

describe("how a sheet brings a screen reader to its heading", () => {
  it("says its heading on the web, where a screen reader cannot be moved to it", async () => {
    const held: Text[] = [];
    await render(
      <Type
        ref={(node) => {
          if (node !== null) held.push(node);
        }}
        set="sentence"
        tone="silver"
      >
        What are we seeing?
      </Type>,
    );
    const [heading] = held;
    if (heading === undefined) throw new Error("no heading was drawn");
    const said = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    const moved = jest.spyOn(AccessibilityInfo, "sendAccessibilityEvent");
    said.mockClear();
    moved.mockClear();

    headingReachFor("web")(heading, "What are we seeing?");
    headingReachFor("ios")(heading, "What are we seeing?");

    expect(said.mock.calls).toEqual([["What are we seeing?"]]);
    expect(moved.mock.calls).toEqual([[heading, "focus"]]);
  });
});
