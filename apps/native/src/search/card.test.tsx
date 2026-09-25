import type { SeatGroupResult } from "@seatscout/client";
import { describe, expect, it, jest } from "@jest/globals";
import { labelOf, roomNameOf } from "@seatscout/view-logic";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { contrastOf, READS_AT } from "../../test/contrast.js";
import {
  everyControlReachesTheTouchFloor,
  everyControlSaysWhatItIs,
} from "../../test/floors.js";
import { houseLights } from "../../test/lights.js";
import { first, formatted, NOW, settled, still } from "../../test/rooms.js";
import type { Clock } from "../host/clock.js";
import { type Appearance, themeFor } from "../theme.js";
import { Card } from "./card.js";

const APPEARANCES: readonly Appearance[] = ["down", "up"];

interface Over {
  readonly online?: boolean;
  readonly now?: number;
  readonly clock?: Clock;
  readonly onRoom?: (result: SeatGroupResult) => void;
  readonly onHandOff?: (result: SeatGroupResult) => void;
}

const shown = async (result: SeatGroupResult, over: Over = {}) => {
  await render(
    <Card
      clock={over.clock ?? still(over.now ?? NOW)}
      onHandOff={over.onHandOff ?? (() => undefined)}
      online={over.online ?? true}
      onRoom={over.onRoom ?? (() => undefined)}
      result={result}
    />,
  );
};

const body = (result: SeatGroupResult) =>
  screen.getByRole("button", { name: roomNameOf(result) });

describe("a Seat Group's card", () => {
  it("names its Theater, when it starts, and where the Seats sit and why", async () => {
    const result = first(await settled());
    await shown(result);

    expect(
      screen.getByText(result.showtime.presentation.theater.name),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(/^\d{1,2}:\d{2}[ap] · Row \d+ of \d+ · /),
    ).toBeOnTheScreen();
    expect(screen.getByText(labelOf(result))).toBeOnTheScreen();
  });

  it("tags every Format the room is showing in, each in the dim beam's edge", async () => {
    houseLights("down");
    const result = formatted(await settled());
    await shown(result);

    for (const format of result.showtime.presentation.formats) {
      expect(screen.getByText(format)).toBeOnTheScreen();
      expect(
        StyleSheet.flatten(
          screen.getByTestId(`format-${format}`).props["style"],
        ),
      ).toMatchObject({ borderColor: "#82bad5", borderWidth: 1 });
    }
  });

  it("attests the one Source it read and how fresh that reading is", async () => {
    await shown(first(await settled()), { now: NOW + 8_000 });

    expect(screen.getByText("1 source")).toBeOnTheScreen();
    expect(screen.getByText("8s")).toBeOnTheScreen();
  });

  it("counts the Seats of the room that could not be booked", async () => {
    const result = first(await settled());
    await shown({
      ...result,
      removed: { ...result.removed, unavailable: 26 },
      seatCount: 239,
    });

    expect(screen.getByText("26 of 239 not bookable")).toBeOnTheScreen();
  });

  it("says nothing of the kind where every Seat was for sale", async () => {
    const result = first(await settled());
    await shown({ ...result, removed: { ...result.removed, unavailable: 0 } });

    expect(screen.queryByText(/not bookable/)).toBeNull();
  });

  it("draws no empty line where every Seat was for sale and none carries a Designation", async () => {
    const result = first(await settled());
    await shown({ ...result, removed: { ...result.removed, unavailable: 0 } });

    expect(screen.queryAllByText(/^$/)).toHaveLength(0);
  });

  it("names the Designation of every Seat of a group that carries one", async () => {
    const result = first(await settled());
    const [seat, beside] = result.seats;
    if (seat === undefined || beside === undefined)
      throw new Error("the group is not a pair");
    await shown({
      ...result,
      seats: [{ ...seat, designation: "wheelchair" }, beside],
    });

    expect(
      screen.getByText(`${seat.id} wheelchair · ${beside.id} standard`),
    ).toBeOnTheScreen();
  });
});

describe("the two things a card can be pressed for", () => {
  it("opens the room from the card's body", async () => {
    const opened = jest.fn<(result: SeatGroupResult) => void>();
    const result = first(await settled());
    await shown(result, { onRoom: opened });

    await fireEvent.press(body(result));

    expect(opened).toHaveBeenCalledWith(result);
  });

  it("starts the hand-off from the Seat label beside it", async () => {
    const taken = jest.fn<(result: SeatGroupResult) => void>();
    const result = first(await settled());
    await shown(result, { onHandOff: taken });

    await fireEvent.press(
      screen.getByRole("button", { name: labelOf(result) }),
    );

    expect(taken).toHaveBeenCalledWith(result);
  });

  it("stops offering the hand-off offline, and still says which Seats they are", async () => {
    const result = first(await settled());
    await shown(result, { online: false });

    expect(screen.queryByRole("button", { name: labelOf(result) })).toBeNull();
    expect(screen.getByText(labelOf(result))).toBeOnTheScreen();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});

describe("what a card owes the person reading it", () => {
  it.each(APPEARANCES)(
    "reads every line against the card's own ground with the house lights %s",
    async (appearance) => {
      houseLights(appearance);
      await shown(first(await settled()));
      const ground = themeFor(appearance).colours.raised;

      const dim = screen
        .getAllByText(/\S/)
        .filter(
          (line) =>
            contrastOf(
              String(StyleSheet.flatten(line.props["style"]).color),
              ground,
            ) < READS_AT,
        );

      expect(dim.map((line) => String(line.props["children"]))).toEqual([]);
    },
  );

  it("draws both its controls at the platform's touch floor, each with a name", async () => {
    await shown(first(await settled()));

    everyControlReachesTheTouchFloor();
    everyControlSaysWhatItIs();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("carries the lit room's own edge, because with the lights up form reads by edge", async () => {
    const result = first(await settled());
    const edge = async (appearance: Appearance) => {
      houseLights(appearance);
      await shown(result);
      const drawn = StyleSheet.flatten(
        screen.getByTestId("card").props["style"],
      );
      await cleanup();
      return String(drawn.borderColor);
    };

    expect(await edge("up")).toBe(themeFor("up").colours.hairline);
    expect(await edge("down")).toBe(themeFor("down").colours.high);
  });
});
