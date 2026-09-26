import { describe, expect, it, jest } from "@jest/globals";
import { frameOf } from "@seatscout/view-logic";
import {
  LAKE_HIGHLANDS_1,
  openedRooms,
  VILLAGE_1,
  WEST_PLANO_28,
} from "@seatscout/view-logic/testing";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { houseLights } from "../../test/lights.js";
import { type Appearance, themeFor } from "../theme.js";
import { refusedIn, seatNamed, shown } from "./room.fixtures.js";
import { RowBar } from "./row-bar.js";

jest.mock("react-native/Libraries/Utilities/useColorScheme");
jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock"),
);
jest.mock("expo-haptics", () => ({ selectionAsync: jest.fn() }));

const flat = (id: string) =>
  StyleSheet.flatten(screen.getByTestId(id).props["style"]);

const drawnMap = () => {
  const { width, height } = flat("seat-map");
  return { width: Number(width), height: Number(height) };
};

describe("the room drawn to the screen it is on", () => {
  it("fills the frame's own width on a tall screen, in the room's own proportions", async () => {
    const room = await shown({ room: WEST_PLANO_28 });
    const frame = flat("map-frame");
    const proportion = frameOf(room.auditorium);
    const inside =
      390 -
      2 *
        (Number(frame.marginHorizontal) +
          Number(frame.paddingHorizontal) +
          Number(frame.borderWidth));

    const map = drawnMap();

    expect(map.width).toBeCloseTo(inside);
    expect(map.height / map.width).toBeCloseTo(
      proportion.height / proportion.width,
    );
  });

  it("gives way to the screen's height on a short screen, so what sits below the map still shows", async () => {
    await shown({
      room: WEST_PLANO_28,
      stage: { x: 0, y: 0, width: 390, height: 200 },
    });

    expect(drawnMap().height).toBeCloseTo(104);
  });

  it("sets the screen edge over the map at the map's own width", async () => {
    await shown({ room: WEST_PLANO_28 });

    const edge = StyleSheet.flatten(
      screen.getByTestId("screen-edge", { includeHiddenElements: true }).props[
        "style"
      ],
    );

    expect(edge.width).toBe(drawnMap().width);
  });

  it("draws the map at no size until the screen has been measured", async () => {
    await shown({ stage: null });

    expect(drawnMap()).toEqual({ width: 0, height: 0 });
  });

  it("stands the room and its dock on the house ground and the map on the deeper ground inside a hairline, in either appearance", async () => {
    const grounds = async (appearance: Appearance) => {
      houseLights(appearance);
      await shown();
      const drawn = {
        stage: flat("stage").backgroundColor,
        map: flat("map-frame").backgroundColor,
        edge: flat("map-frame").borderColor,
        back: flat("return").borderColor,
        rule: flat("provenance").borderTopColor,
        bar: flat("row-bar").backgroundColor,
        barEdge: flat("row-bar").borderColor,
        dock: flat("dock").backgroundColor,
        dockRule: flat("dock").borderTopColor,
      };
      await cleanup();
      return drawn;
    };

    for (const appearance of ["down", "up"] as const) {
      const { colours } = themeFor(appearance);
      expect(await grounds(appearance)).toEqual({
        stage: colours.house,
        map: colours.houseDeep,
        edge: colours.hairline,
        back: colours.hairline,
        rule: colours.hairline,
        bar: colours.raised,
        barEdge: colours.hairline,
        dock: colours.house,
        dockRule: colours.hairline,
      });
    }
  });
});

describe("the row bar", () => {
  it("edges a refusal in velvet, in either appearance", async () => {
    for (const appearance of ["down", "up"] as const) {
      houseLights(appearance);
      const room = await shown();
      await fireEvent.press(seatNamed(refusedIn(room).id));

      expect(flat("row-bar").borderColor).toBe(
        themeFor(appearance).colours.velvet,
      );
      await cleanup();
    }
  });

  it("leaves the row chip off a row that agrees on no label, and still names its ordinal", async () => {
    const [opened] = await openedRooms(undefined, [VILLAGE_1]);
    const row = opened?.auditorium.map.rows[4];
    if (opened === undefined || row === undefined)
      throw new Error("the room has no fifth row");

    await render(
      <RowBar map={opened.auditorium.map} notice={null} row={row} />,
    );

    expect(
      screen.getByText(
        "5th row of 10 from the front. 23 seats, 21 bookable, 11 of them wheelchair or companion spaces.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/^ROW/)).toBeNull();
  });
});

describe("the room's standing facts", () => {
  it("lists what the room offers, one after another", async () => {
    await shown({ room: LAKE_HIGHLANDS_1 });

    expect(
      screen.getByText("Accessibility Devices · Closed Captioning"),
    ).toBeOnTheScreen();
  });

  it("draws no line for what a room offers when it offers nothing", async () => {
    await shown({ room: WEST_PLANO_28 });

    expect(screen.getByTestId("facts").children).toHaveLength(1);
  });
});
