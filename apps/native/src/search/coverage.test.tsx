import type { Coverage, Snapshot } from "@seatscout/client";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { houseLights } from "../../test/lights.js";
import { type Appearance, themeFor } from "../theme.js";
import { Strip } from "./coverage.js";

const APPEARANCES: readonly Appearance[] = ["down", "up"];

const covering = (candidates: number, checked: number): Coverage => ({
  started: [],
  noSeatMap: [],
  soldOut: [],
  salesOff: [],
  unidentified: [],
  failed: [],
  candidates,
  checked,
});

const reading = async (
  phase: Snapshot["phase"],
  candidates = 0,
  checked = 0,
  onLedger: () => void = () => undefined,
) => {
  await render(
    <Strip
      onLedger={onLedger}
      onReadMore={() => undefined}
      today="2026-08-28"
      snapshot={{
        results: [],
        coverage: covering(candidates, checked),
        phase,
        days: [],
        refused: false,
      }}
    />,
  );
};

describe("the coverage strip", () => {
  it("says it is reading the listing before there is anything to count", async () => {
    await reading("resolving");

    expect(screen.getByRole("status")).toHaveTextContent("Reading the listing");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("counts candidates, checks and what is still to come once the listing is in", async () => {
    await reading("searching", 176, 84);

    expect(screen.getByRole("status")).toHaveTextContent(
      "176 candidates · 84 checked · 92 to go",
    );
  });

  it("stops counting what is to come once every candidate has an answer", async () => {
    await reading("settled", 176, 176);

    expect(screen.getByRole("status")).toHaveTextContent(
      "176 candidates · 176 checked",
    );
    expect(screen.queryByTestId("progress")).toBeNull();
  });

  it("says nothing was read when the listing itself failed, and offers no ledger", async () => {
    await reading("unreachable");

    expect(screen.getByRole("status")).toHaveTextContent("Nothing was read");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("draws the share already read beside the counts while the search is in flight", async () => {
    await reading("searching", 200, 84);
    const read = StyleSheet.flatten(screen.getByTestId("read").props["style"]);

    expect(String(read.width)).toBe("42%");
  });

  it("draws no share where nothing was listed, so no division is attempted", async () => {
    await reading("searching");
    const read = StyleSheet.flatten(screen.getByTestId("read").props["style"]);

    expect(String(read.width)).toBe("0%");
  });

  it("opens the ledger from the link it always carries once it has counted", async () => {
    const opened = jest.fn<() => void>();
    await reading("settled", 176, 176, opened);

    await fireEvent.press(screen.getByRole("button", { name: "ledger ›" }));

    expect(opened).toHaveBeenCalledTimes(1);
  });

  it.each(APPEARANCES)(
    "rules itself with the hairline and lays its track on the raised ground, lights %s",
    async (appearance) => {
      houseLights(appearance);
      await reading("searching", 200, 84);
      const { colours } = themeFor(appearance);

      expect(
        StyleSheet.flatten(screen.getByTestId("strip").props["style"]),
      ).toMatchObject({ borderTopColor: colours.hairline, borderTopWidth: 1 });
      expect(
        StyleSheet.flatten(screen.getByTestId("progress").props["style"]),
      ).toMatchObject({ backgroundColor: colours.high });
    },
  );
});
