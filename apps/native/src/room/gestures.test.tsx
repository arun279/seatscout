import { describe, expect, it, jest } from "@jest/globals";
import { frameOf } from "@seatscout/view-logic";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { State } from "react-native-gesture-handler";
import {
  fireGestureHandler,
  getByGestureTestId,
} from "react-native-gesture-handler/jest-utils";
import { animatedTo } from "../../test/reanimated.js";
import { type Shown, seatNamed, shown } from "./room.fixtures.js";

jest.mock("react-native/Libraries/Utilities/useColorScheme");
jest.mock("react-native-reanimated", () =>
  require("../../test/reanimated.js").onTheJsThread(),
);
jest.mock("expo-haptics", () => ({ selectionAsync: jest.fn() }));

const drawnAt = () => {
  const drawn = animatedTo("drawing")?.["matrix"];
  if (!Array.isArray(drawn)) throw new Error("the drawing carries no matrix");
  const [scale, , , , tx, ty] = drawn.map(Number);
  if (scale === undefined || tx === undefined || ty === undefined)
    throw new Error("the matrix is short");
  return { scale, tx, ty };
};

const perUnitIn = (room: Shown) =>
  Number(
    StyleSheet.flatten(screen.getByTestId("seat-map").props["style"]).width,
  ) / frameOf(room.auditorium).width;

const pinched = (scale: number, focalX: number, focalY: number) =>
  act(() =>
    fireGestureHandler(getByGestureTestId("pinch"), [
      { state: State.BEGAN, scale: 1, focalX, focalY },
      { state: State.ACTIVE, scale: 1, focalX, focalY },
      { scale, focalX, focalY },
      { state: State.END, scale, focalX, focalY },
    ]),
  );

const dragged = (translationX: number, translationY: number) =>
  act(() =>
    fireGestureHandler(getByGestureTestId("pan"), [
      { state: State.BEGAN, translationX: 0, translationY: 0 },
      { state: State.ACTIVE, translationX: 0, translationY: 0 },
      { translationX, translationY },
      { state: State.END, translationX, translationY },
    ]),
  );

describe("the map under the fingers", () => {
  it("opens fitted, with the Seat ids hidden", async () => {
    await shown();

    expect(animatedTo("drawing")).toEqual({ matrix: [1, 0, 0, 1, 0, 0] });
    expect(animatedTo("ids")).toEqual({ opacity: 0 });
  });

  it("zooms about the point between the fingers, so that point stays under them", async () => {
    const room = await shown();
    const perUnit = perUnitIn(room);

    await pinched(3, 100, 60);

    const { scale, tx, ty } = drawnAt();
    expect(scale).toBe(3);
    expect(3 * (100 / perUnit) + tx).toBeCloseTo(100 / perUnit);
    expect(3 * (60 / perUnit) + ty).toBeCloseTo(60 / perUnit);
  });

  it("moves a zoomed map with a drag, point for point", async () => {
    const room = await shown();
    const perUnit = perUnitIn(room);
    await pinched(3, 100, 60);
    const before = drawnAt();

    await dragged(-30, -20);

    expect(drawnAt().tx - before.tx).toBeCloseTo(-30 / perUnit);
    expect(drawnAt().ty - before.ty).toBeCloseTo(-20 / perUnit);
  });

  it("shows the Seat ids at the closest the map comes", async () => {
    await shown();

    await pinched(100, 0, 0);

    expect(animatedTo("ids")).toEqual({ opacity: 1 });
  });

  it("brings a pressed Seat that sat outside the zoomed view into it", async () => {
    const room = await shown();
    const frame = frameOf(room.auditorium);
    await pinched(3, 0, 0);
    const far = room.auditorium.map.rows
      .flatMap((row) => row.seats)
      .reduce((most, seat) =>
        seat.x + seat.y > most.x + most.y ? seat : most,
      );
    const inView = () => {
      const { scale, tx, ty } = drawnAt();
      const at = (along: number, from: number, moved: number) =>
        scale * (along - from) + moved;
      return (
        at(far.x, frame.x, tx) >= 0 &&
        at(far.x + far.width, frame.x, tx) <= frame.width &&
        at(far.y, frame.y, ty) >= 0 &&
        at(far.y + far.height, frame.y, ty) <= frame.height
      );
    };
    expect(inView()).toBe(false);

    await fireEvent.press(seatNamed(far.id));

    expect(inView()).toBe(true);
  });

  it("follows the midpoint of two fingers in a drag on Android as on iOS", async () => {
    await shown();

    expect(getByGestureTestId("pan").config["avgTouches"]).toBe(true);
  });
});
