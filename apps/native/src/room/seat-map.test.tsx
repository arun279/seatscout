import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  mapLabelOf,
  holds,
  moved,
  placed,
  seatNameOf,
} from "@seatscout/view-logic";
import { HOOKY_ADDISON, WEST_PLANO_28 } from "@seatscout/view-logic/testing";
import { screen } from "@testing-library/react-native";
import { processColor } from "react-native";
import { houseLights } from "../../test/lights.js";
import { themeFor } from "../theme.js";
import { seatNamed, seatsOnScreen, shown } from "./room.fixtures.js";

jest.mock("react-native/Libraries/Utilities/useColorScheme");
jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock"),
);
jest.mock("expo-haptics", () => ({ selectionAsync: jest.fn() }));

const DOWN = themeFor("down").colours;

const ink = (tone: string) => ({
  type: 0,
  payload: processColor(tone),
});

beforeEach(() => {
  houseLights("down");
});

describe("the Auditorium drawn to scale", () => {
  it("draws every Seat the room has, each with the name view-logic gives it", async () => {
    const room = await shown();
    const seats = room.auditorium.map.rows.flatMap((row) => row.seats);
    const recommended = room.result.seats.map((seat) => seat.id);

    expect(seatsOnScreen()).toHaveLength(seats.length);
    expect(seatsOnScreen()).toEqual(
      seats.map((seat) => seatNameOf(seat, recommended, false)),
    );
  });

  it("puts them in the traversal order view-logic defines, row by row from the front", async () => {
    const room = await shown();
    const { map } = room.auditorium;
    const stepped = map.rows.flatMap((row) =>
      row.seats.map((seat) => `Seat ${seat.id}`),
    );

    expect(seatsOnScreen().map((name) => name.split(". ")[0])).toEqual(stepped);
  });

  it("steps to the Seat beside the one it draws next, which is what moved says", async () => {
    const room = await shown();
    const { map } = room.auditorium;

    for (const row of map.rows)
      for (const [at, seat] of row.seats.entries()) {
        const next = moved(map, placed({ row, seat }), "ArrowRight", false);
        expect(next.seat.id).toBe((row.seats[at + 1] ?? seat).id);
      }
  });

  it("speaks the room, its size and the recommendation on entry, and no keys a phone lacks", async () => {
    const room = await shown();

    expect(
      screen.getByLabelText(mapLabelOf(room.auditorium, room.result)),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText(/Arrow keys/)).toBeNull();
  });

  it("lights the chosen Seat Group and leaves every other Seat for sale", async () => {
    const room = await shown();
    const seats = room.auditorium.map.rows.flatMap((held) => held.seats);
    const lit = seats.filter((seat) => holds(room.result, seat));
    const free = seats.filter(
      (seat) =>
        !holds(room.result, seat) &&
        seat.bookable &&
        seat.designation === "standard",
    );
    const fillOf = (seat: { readonly id: string }) =>
      seatNamed(seat.id).props["fill"];

    expect(lit.map((seat) => seat.id)).toEqual(
      room.result.seats.map((seat) => seat.id),
    );
    expect(lit.map(fillOf)).toEqual(lit.map(() => ink(DOWN.beam)));
    expect(free.map(fillOf)).toEqual(free.map(() => ink(DOWN.seatFree)));
  });

  it("outlines a Seat that is not bookable rather than filling it", async () => {
    const room = await shown();
    const gone = room.auditorium.map.rows
      .flatMap((row) => row.seats)
      .find((seat) => !seat.bookable && seat.designation === "standard");
    if (gone === undefined) throw new Error("every Seat is bookable");

    expect(seatNamed(gone.id).props["stroke"]).toEqual(ink(DOWN.seatGone));
    expect(seatNamed(gone.id).props["fill"]).not.toEqual(ink(DOWN.seatFree));
  });
});

describe("the Seats that are wheelchair spaces and companion seats", () => {
  it("draws each of them dashed rather than as an ordinary Seat", async () => {
    const room = await shown();
    const spaces = room.auditorium.map.rows
      .flatMap((row) => row.seats)
      .filter((seat) => seat.designation !== "standard");

    expect(spaces.length).toBeGreaterThan(0);
    for (const space of spaces) {
      expect(seatNamed(space.id).props["strokeDasharray"]).toEqual([2.2, 1.6]);
      expect(seatNamed(space.id).props["stroke"]).toEqual(
        ink(space.bookable ? DOWN.beamDim : DOWN.seatGone),
      );
    }
  });

  it("lights one of them when the query asked for accessible seating and the choice holds it", async () => {
    const room = await shown({ accessibleSeating: true });
    const space = room.result.seats.find(
      (seat) => seat.designation !== "standard",
    );
    if (space === undefined)
      throw new Error("the recommendation holds no space");

    expect(seatNamed(space.id).props["fill"]).toEqual(ink(DOWN.beam));
    expect(seatNamed(space.id).props["strokeDasharray"]).toEqual([2.2, 1.6]);
  });

  it("never offers one of them while the query has not asked for accessible seating", async () => {
    const room = await shown();
    const offered = new Set(
      room.auditorium.offered.flatMap((group) =>
        group.seats.map((seat) => seat.id),
      ),
    );
    const spaces = room.auditorium.map.rows
      .flatMap((row) => row.seats)
      .filter((seat) => seat.designation !== "standard");

    for (const space of spaces) {
      expect(offered.has(space.id)).toBe(false);
      expect(seatNamed(space.id).props["accessibilityLabel"]).toContain(
        "kept out of ordinary results",
      );
    }
  });
});

describe("what the room's own furniture is drawn with", () => {
  it("marks a console between the Seats a pod divider parts", async () => {
    const room = await shown({ room: HOOKY_ADDISON });
    const divided = room.auditorium.map.rows.filter((row) =>
      row.gapAfter.includes("pod"),
    );

    expect(divided.length).toBeGreaterThan(0);
    expect(screen.getByText("console")).toBeOnTheScreen();
  });

  it("leaves the console out of the legend of a room that has none", async () => {
    await shown({ room: WEST_PLANO_28 });

    expect(screen.queryByText("console")).toBeNull();
    expect(screen.getByText("for sale")).toBeOnTheScreen();
    expect(
      screen.getByText("wheelchair or companion, kept out of ordinary results"),
    ).toBeOnTheScreen();
  });
});
