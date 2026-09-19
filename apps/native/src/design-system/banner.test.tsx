import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
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
});
