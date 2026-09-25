import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, Platform, StyleSheet } from "react-native";
import { contrastOf, READS_AT } from "../../test/contrast.js";
import { houseLights } from "../../test/lights.js";
import { type Appearance, themeFor } from "../theme.js";
import { Banner } from "./banner.js";

const APPEARANCES: readonly Appearance[] = ["down", "up"];

describe("the offline banner", () => {
  it("says why nothing on the screen will refresh, and says it once", async () => {
    houseLights("down");
    await render(<Banner />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Offline. Seats are never cached, so nothing here is refreshed until the connection returns.",
    );
    expect(screen.getByRole("status").props["aria-live"]).toBe("polite");
  });

  it.each(APPEARANCES)(
    "reads against its own ground with the house lights %s",
    async (appearance) => {
      houseLights(appearance);
      await render(<Banner />);
      const said = StyleSheet.flatten(
        screen.getByText(/^Offline\./).props["style"],
      );

      expect(
        contrastOf(String(said.color), themeFor(appearance).colours.high),
      ).toBeGreaterThanOrEqual(READS_AT);
    },
  );

  it("announces itself where a live region is not read out, and leaves it to the live region where it is", async () => {
    const announced = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => undefined);
    announced.mockClear();
    houseLights("down");
    const { rerender, unmount } = await render(<Banner />);
    await rerender(<Banner />);
    const onceDrawn = announced.mock.calls.length;
    await unmount();

    expect(announced.mock.calls).toEqual(
      Platform.OS === "android"
        ? []
        : [
            [
              "Offline. Seats are never cached, so nothing here is refreshed until the connection returns.",
            ],
          ],
    );
    expect(onceDrawn).toBe(announced.mock.calls.length);
    announced.mockRestore();
  });

  it.each([
    { appearance: "down", ground: "#202333", rule: "#323748", dot: "#f798a4" },
    { appearance: "up", ground: "#e2d8c6", rule: "#cabdaa", dot: "#940331" },
  ] satisfies readonly {
    appearance: Appearance;
    ground: string;
    rule: string;
    dot: string;
  }[])(
    "draws its own raised ground, its rule and its lit dot with the house lights $appearance",
    async ({ appearance, ground, rule, dot }) => {
      houseLights(appearance);
      await render(<Banner />);

      expect(
        StyleSheet.flatten(screen.getByTestId("offline-banner").props["style"]),
      ).toMatchObject({
        backgroundColor: ground,
        borderTopColor: rule,
        borderTopWidth: 1,
        flexDirection: "row",
      });
      expect(
        StyleSheet.flatten(screen.getByTestId("offline-dot").props["style"]),
      ).toMatchObject({ backgroundColor: dot, height: 7, width: 7 });
    },
  );
});
