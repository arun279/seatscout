import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Auditorium } from "@seatscout/client";
import {
  HOOKY_ADDISON,
  STRIKE_AND_REEL_1,
  WEST_PLANO_28,
} from "@seatscout/view-logic/testing";
import { fireEvent, screen } from "@testing-library/react-native";
import { processColor } from "react-native";
import { houseLights } from "../../test/lights.js";
import { themeFor } from "../theme.js";
import { otherThan, seatNamed, shown } from "./room.fixtures.js";

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

describe("how each Seat is inked", () => {
  const drawnAs = (id: string) => {
    const { fill, stroke, strokeDasharray, filter, rx } = seatNamed(id).props;
    return { fill, stroke, strokeDasharray, filter, rx };
  };

  it("fills a Seat for sale with no edge, rounded by a quarter of its width", async () => {
    const room = await shown({ room: WEST_PLANO_28 });
    const free = room.auditorium.map.rows
      .flatMap((row) => row.seats)
      .find(
        (seat) =>
          seat.bookable &&
          seat.designation === "standard" &&
          !room.result.seats.some((held) => held.id === seat.id),
      );
    if (free === undefined) throw new Error("nothing is for sale");

    expect(drawnAs(free.id)).toEqual({
      fill: ink(DOWN.seatFree),
      stroke: undefined,
      strokeDasharray: undefined,
      filter: undefined,
      rx: 4.5,
    });
  });

  it("leaves a Seat that is gone hollow inside a seat-gone edge", async () => {
    const room = await shown();
    const gone = room.auditorium.map.rows
      .flatMap((row) => row.seats)
      .find((seat) => !seat.bookable && seat.designation === "standard");
    if (gone === undefined) throw new Error("every Seat is bookable");

    expect(drawnAs(gone.id)).toMatchObject({
      fill: null,
      stroke: ink(DOWN.seatGone),
      strokeDasharray: undefined,
    });
  });

  it("leaves a wheelchair space nobody chose hollow inside its dashed edge", async () => {
    const room = await shown();
    const space = room.auditorium.map.rows
      .flatMap((row) => row.seats)
      .find((seat) => seat.bookable && seat.designation !== "standard");
    if (space === undefined) throw new Error("the room has no open space");

    expect(drawnAs(space.id)).toMatchObject({
      fill: null,
      stroke: ink(DOWN.beamDim),
    });
  });

  it("glows the lit Seats, and nothing else, with the house lights down", async () => {
    await shown({ room: WEST_PLANO_28 });

    expect(["H14", "H13", "H12"].map((id) => drawnAs(id).filter)).toEqual([
      "lit",
      "lit",
      undefined,
    ]);
  });

  it("glows nothing with the house lights up", async () => {
    houseLights("up");
    await shown({ room: WEST_PLANO_28 });

    expect(drawnAs("H14").filter).toBeUndefined();
  });

  it("rings the recommendation once the choice has moved off it, and never while the choice holds it", async () => {
    const room = await shown({ room: HOOKY_ADDISON });
    const recommended = room.result.seats.map((seat) => seat.id);
    expect(recommended.map((id) => drawnAs(id).stroke)).toEqual(
      recommended.map(() => undefined),
    );

    await fireEvent.press(
      screen.getByRole("radio", {
        name: new RegExp(
          `^${otherThan(room)
            .seats.map((seat) => seat.id)
            .join("·")} `,
        ),
      }),
    );

    expect(recommended.map((id) => drawnAs(id).stroke)).toEqual(
      recommended.map(() => ink(DOWN.beamDim)),
    );
  });
});

describe("the room's own furniture drawn to scale", () => {
  const all = (id: string) => screen.getAllByTestId(id);
  const one = (id: string) => screen.getByTestId(id).props;

  it("sets the room's own origin at the drawing's corner, in a view box the room's own size", async () => {
    await shown({ room: WEST_PLANO_28 });

    const [, , , , x, y] = one("room")["matrix"];
    expect([x, y]).toEqual([28.8, 9]);
    expect(one("plan")).toMatchObject({ vbWidth: 555.8, vbHeight: 336 });
  });

  it("labels each row that agrees on a label, and no other", async () => {
    await shown();

    expect(all("row-label")).toHaveLength(9);
  });

  it("sets a row's label in the gutter, level with the middle of its Seats and sized by them", async () => {
    await shown({ room: WEST_PLANO_28 });
    const [first] = all("row-label");

    expect(first?.props["x"][0]).toBeCloseTo(-7.2, 10);
    expect(first?.props["y"]).toEqual([9]);
    expect(first?.props["font"].fontSize).toBeCloseTo(12.6, 10);
  });

  it("sets the label of a row whose Seats differ level with the middle of the tallest of them from the highest", async () => {
    await shown({
      room: STRIKE_AND_REEL_1,
      reshaped: (auditorium: Auditorium) => {
        const [first, ...rest] = auditorium.map.rows;
        const [corner, ...others] = first?.seats ?? [];
        if (first === undefined || corner === undefined)
          throw new Error("the room has no first Seat");
        return {
          ...auditorium,
          map: {
            ...auditorium.map,
            rows: [
              {
                ...first,
                seats: [
                  {
                    ...corner,
                    y: corner.y - 4,
                    width: corner.width + 6,
                    height: corner.height + 10,
                  },
                  ...others,
                ],
              },
              ...rest,
            ],
          },
        };
      },
    });
    const [first] = all("row-label");

    expect(first?.props["y"]).toEqual([42.3]);
  });

  it("ticks every console a pod divider parts", async () => {
    await shown();
    const [first] = all("tick");

    expect(all("tick")).toHaveLength(133);
    expect(first?.props).toMatchObject({ x1: 60.3925, x2: 60.3925 });
    expect(first?.props["y1"]).toBeCloseTo(2.8532, 3);
    expect(first?.props["y2"]).toBeCloseTo(11.4128, 3);
  });

  it("rings the Seat the Seat Profile aims at, dashed", async () => {
    await shown({ room: WEST_PLANO_28 });

    expect(one("aim")).toMatchObject({
      cx: 249,
      cy: 229,
      r: 25.2,
      strokeDasharray: [3, 3],
    });
  });

  it("writes each chosen Seat's id in its middle, sized by its width", async () => {
    await shown({ room: WEST_PLANO_28 });
    const written = all("seat-id").map((id) => ({
      x: id.props["x"],
      y: id.props["y"],
      size: id.props["font"].fontSize,
    }));
    const middles = ["H14", "H13"].map((id) => {
      const { x, y, width, height } = seatNamed(id).props;
      return { x: [x + width / 2], y: [y + height / 2], size: 7.56 };
    });

    expect(written).toEqual(middles);
  });
});
