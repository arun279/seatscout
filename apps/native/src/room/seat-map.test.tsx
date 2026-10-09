import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { mapLabelOf, seatNameOf } from "@seatscout/view-logic";
import {
  HOOKY_SOUTHLAKE,
  openedRooms,
  VILLAGE_1,
  WEST_PLANO_10,
} from "@seatscout/view-logic/testing";
import { screen } from "@testing-library/react-native";
import { processColor } from "react-native";
import { houseLights } from "../../test/lights.js";
import { themeFor } from "../theme.js";
import { seatNamed, seatsOnScreen, shown } from "./room.fixtures.js";
import { announcedOn, placeAt } from "./seat-map.js";

jest.mock("react-native/Libraries/Utilities/useColorScheme");

const DOWN = themeFor("down").colours;

const ink = (tone: string) => ({
  type: 0,
  payload: processColor(tone),
});

beforeEach(() => {
  houseLights("down");
});

describe("the Auditorium drawn to scale", () => {
  it("names the map once and sends a reader to the list below it to choose", async () => {
    await shown();

    expect(screen.getByRole("summary").props["accessibilityHint"]).toBe(
      "Every group of seats on the map is also in the list below it, where it can be chosen.",
    );
  });

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

  it("speaks the room, its size and the recommendation on entry, and no keys a phone lacks", async () => {
    const room = await shown();

    expect(
      screen.getByLabelText(mapLabelOf(room.auditorium, room.result)),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText(/Arrow keys/)).toBeNull();
  });

  it("lights the chosen Seat Group and leaves every other Seat for sale", async () => {
    const room = await shown();
    const chosen = ["D18", "D17"];
    const free = room.auditorium.map.rows
      .flatMap((held) => held.seats)
      .filter(
        (seat) =>
          !chosen.includes(seat.id) &&
          seat.bookable &&
          seat.designation === "standard",
      );
    const fillOf = (seat: { readonly id: string }) =>
      seatNamed(seat.id).props["fill"];

    expect(chosen.map((id) => fillOf({ id }))).toEqual([
      ink(DOWN.beam),
      ink(DOWN.beam),
    ]);
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
      room.auditorium.offered.flatMap(({ group }) =>
        group.seats.map((seat) => seat.id),
      ),
    );
    const spaces = room.auditorium.map.rows
      .flatMap((row) => row.seats)
      .filter((seat) => seat.designation !== "standard");

    for (const space of spaces) {
      expect(offered.has(space.id)).toBe(false);
      expect(seatNamed(space.id).props["accessibilityLabel"]).toContain(
        space.bookable ? "kept out of ordinary results" : "Not bookable.",
      );
    }
  });
});

describe("what the room's own furniture is drawn with", () => {
  it("marks a console between the Seats a pod divider parts", async () => {
    const room = await shown({ room: HOOKY_SOUTHLAKE });
    const divided = room.auditorium.map.rows.filter((row) =>
      row.gapAfter.includes("pod"),
    );

    expect(divided.length).toBeGreaterThan(0);
    expect(screen.getByText("console")).toBeOnTheScreen();
  });

  it("leaves the console out of the legend of a room that has none", async () => {
    await shown({ room: WEST_PLANO_10 });

    expect(screen.queryByText("console")).toBeNull();
    expect(screen.getByText("for sale")).toBeOnTheScreen();
    expect(
      screen.getByText("wheelchair or companion, kept out of ordinary results"),
    ).toBeOnTheScreen();
  });
});

describe("the Seat a point in the room falls on", () => {
  const mapOf = async () => {
    const [opened] = await openedRooms(undefined, [VILLAGE_1]);
    if (opened === undefined) throw new Error("the room was never opened");
    const { map } = opened.auditorium;
    const places = map.rows.flatMap((row) =>
      row.seats.map((seat) => ({ row, seat })),
    );
    const most = (by: (place: (typeof places)[number]) => number) =>
      places.reduce((best, place) => (by(place) > by(best) ? place : best));
    return {
      map,
      left: most(({ seat }) => -seat.x),
      right: most(({ seat }) => seat.x + seat.width),
      front: most(({ seat }) => -seat.y),
      back: most(({ seat }) => seat.y + seat.height),
    };
  };

  it("is the Seat whose box holds the point, its edges included", async () => {
    const { map, left, right } = await mapOf();

    expect(placeAt(map, { x: left.seat.x, y: left.seat.y })).toEqual(left);
    expect(
      placeAt(map, {
        x: right.seat.x + right.seat.width,
        y: right.seat.y + right.seat.height,
      }),
    ).toEqual(right);
  });

  it("is no Seat for a point just past the room on any side", async () => {
    const { map, left, right, front, back } = await mapOf();
    const PAST = 0.01;
    const across = ({ seat }: typeof left) => seat.x + seat.width / 2;
    const down = ({ seat }: typeof left) => seat.y + seat.height / 2;

    expect(
      [
        { x: left.seat.x - PAST, y: down(left) },
        { x: right.seat.x + right.seat.width + PAST, y: down(right) },
        { x: across(front), y: front.seat.y - PAST },
        { x: across(back), y: back.seat.y + back.seat.height + PAST },
      ].map((at) => placeAt(map, at)),
    ).toEqual([undefined, undefined, undefined, undefined]);
  });
});

describe("each Seat as a screen reader meets it", () => {
  it("is its own element on a phone", async () => {
    await shown();

    expect(seatNamed("D18").props["accessible"]).toBe(true);
    expect(announcedOn("ios")).toEqual({ accessible: true });
    expect(announcedOn("android")).toEqual({ accessible: true });
  });

  it("leaves the attribute off the web's DOM, which takes its label and role instead", () => {
    expect(announcedOn("web")).toEqual({});
  });
});
