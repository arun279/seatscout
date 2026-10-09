import { describe, expect, it, jest } from "@jest/globals";
import { chosenOf, frameOf } from "@seatscout/view-logic";
import { HOOKY_SOUTHLAKE } from "@seatscout/view-logic/testing";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { State } from "react-native-gesture-handler";
import {
  fireGestureHandler,
  getByGestureTestId,
} from "react-native-gesture-handler/jest-utils";
import { animatedTo } from "../../test/reanimated.js";
import {
  drawnView,
  otherThan,
  rowBar,
  type Shown,
  shown,
  tapped,
} from "./room.fixtures.js";

jest.mock("react-native/Libraries/Utilities/useColorScheme");
jest.mock("react-native-reanimated", () => {
  const { onTheJsThread } = require("../../test/reanimated.js");
  return onTheJsThread();
});

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

    const { scale, tx, ty } = drawnView();
    expect(scale).toBe(3);
    expect(3 * (100 / perUnit) + tx).toBeCloseTo(100 / perUnit);
    expect(3 * (60 / perUnit) + ty).toBeCloseTo(60 / perUnit);
  });

  it("moves a zoomed map with a drag, point for point", async () => {
    const room = await shown();
    const perUnit = perUnitIn(room);
    await pinched(3, 100, 60);
    const before = drawnView();

    await dragged(-30, -20);

    expect(drawnView().tx - before.tx).toBeCloseTo(-30 / perUnit);
    expect(drawnView().ty - before.ty).toBeCloseTo(-20 / perUnit);
  });

  it("shows the Seat ids at the closest the map comes", async () => {
    await shown();

    await pinched(100, 0, 0);

    expect(animatedTo("ids")).toEqual({ opacity: 1 });
  });

  it("brings the opening Seat back into a zoomed view when the return control is pressed", async () => {
    const room = await shown();
    const frame = frameOf(room.auditorium);
    const seats = room.auditorium.map.rows.flatMap((row) => row.seats);
    const far = seats.reduce((most, seat) =>
      seat.x + seat.y > most.x + most.y ? seat : most,
    );
    const opening = room.auditorium.recommended.place.seat;
    const inView = () => {
      const { scale, tx, ty } = drawnView();
      const across = scale * (opening.x + opening.width / 2 - frame.x) + tx;
      const down = scale * (opening.y + opening.height / 2 - frame.y) + ty;
      return (
        across >= 0 &&
        across <= frame.width &&
        down >= 0 &&
        down <= frame.height
      );
    };
    await tapped(room, far.id);
    await pinched(3, 0, 0);
    expect(inView()).toBe(false);

    await fireEvent.press(screen.getByTestId("return"));

    expect(inView()).toBe(true);
  });

  it("chooses the group holding the Seat a tap lands on, where the zoomed drawing has put it", async () => {
    const room = await shown({ room: HOOKY_SOUTHLAKE });
    const other = otherThan(room);
    const [seat] = other.seats;
    if (seat === undefined) throw new Error("the group holds no Seat");
    const frame = frameOf(room.auditorium);
    const perUnit = perUnitIn(room);
    await pinched(
      3,
      (seat.x + seat.width / 2 - frame.x) * perUnit,
      (seat.y + seat.height / 2 - frame.y) * perUnit,
    );

    await tapped(room, seat.id);

    expect(rowBar().getByText(chosenOf(other))).toBeOnTheScreen();
  });

  it("chooses nothing when a tap is cancelled before it lands", async () => {
    const room = await shown({ room: HOOKY_SOUTHLAKE });
    const other = otherThan(room);
    const [seat] = other.seats;
    if (seat === undefined) throw new Error("the group holds no Seat");
    const frame = frameOf(room.auditorium);
    const perUnit = perUnitIn(room);
    const x = (seat.x + seat.width / 2 - frame.x) * perUnit;
    const y = (seat.y + seat.height / 2 - frame.y) * perUnit;

    await act(() =>
      fireGestureHandler(getByGestureTestId("tap"), [
        { state: State.BEGAN, x, y },
        { state: State.ACTIVE, x, y },
        { state: State.CANCELLED, x, y },
      ]),
    );

    expect(rowBar().queryByText(chosenOf(other))).toBeNull();
  });

  it("follows the midpoint of two fingers in a drag on Android as on iOS", async () => {
    await shown();

    expect(getByGestureTestId("pan").config["avgTouches"]).toBe(true);
  });
});
