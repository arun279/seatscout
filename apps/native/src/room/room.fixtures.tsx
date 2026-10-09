import type {
  Auditorium,
  PlacedGroup,
  PositionedSeat,
  SearchTerms,
  SeatGroupResult,
} from "@seatscout/client";
import { FITTED, frameOf, type View } from "@seatscout/view-logic";
import {
  type CapturedRoom,
  type OpenedRoom,
  openedRooms,
  VILLAGE_1,
} from "@seatscout/view-logic/testing";
import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";
import { type LayoutRectangle, StyleSheet } from "react-native";
import { State } from "react-native-gesture-handler";
import {
  fireGestureHandler,
  getByGestureTestId,
} from "react-native-gesture-handler/jest-utils";
import { animatedTo } from "../../test/reanimated.js";
import { still, TODAY } from "../../test/rooms.js";
import { Room } from "./room.js";

type Found = ReturnType<typeof screen.getByTestId>;

const NOW = 13_000;
const STAGE = { x: 0, y: 0, width: 390, height: 760 };

export interface Shown extends OpenedRoom {
  readonly handedOff: readonly SeatGroupResult[];
  readonly left: readonly string[];
}

const ACCESSIBLE: SearchTerms = {
  movie: "245893",
  dates: [TODAY],
  area: "75006",
  partySize: 2,
  accessibleSeating: true,
};

const measured = async (stage: LayoutRectangle | null = STAGE) => {
  if (stage !== null)
    await fireEvent(screen.getByTestId("scroll"), "layout", {
      nativeEvent: { layout: stage },
    });
};

export const shown = async (
  over: {
    readonly room?: CapturedRoom;
    readonly online?: boolean;
    readonly accessibleSeating?: boolean;
    readonly opening?: (opened: OpenedRoom) => PlacedGroup;
    readonly stage?: LayoutRectangle | null;
    readonly reshaped?: (auditorium: Auditorium) => Auditorium;
  } = {},
): Promise<Shown> => {
  const [opened] = await openedRooms(
    over.accessibleSeating === true ? ACCESSIBLE : undefined,
    [over.room ?? VILLAGE_1],
  );
  if (opened === undefined) throw new Error("the room was never opened");
  const auditorium = over.reshaped?.(opened.auditorium) ?? opened.auditorium;
  const handedOff: SeatGroupResult[] = [];
  const left: string[] = [];

  await render(
    <Room
      auditorium={auditorium}
      clock={still(NOW)}
      onBack={() => left.push("back")}
      onHandOff={(chosen) => handedOff.push(chosen)}
      online={over.online ?? true}
      opening={over.opening?.(opened) ?? auditorium.recommended}
      result={opened.result}
      today={TODAY}
    />,
  );
  await measured(over.stage);

  return { ...opened, auditorium, handedOff, left };
};

export const seatsOnScreen = (): readonly string[] =>
  screen
    .getAllByLabelText(/^Seat [^ ]+\. /)
    .map((seat) => String(seat.props["accessibilityLabel"]));

export const seatNamed = (id: string): Found =>
  screen.getByLabelText(new RegExp(`^Seat ${id}\\. `));

export const drawnView = (): View => {
  const matrix = animatedTo("drawing")?.["matrix"];
  if (!Array.isArray(matrix)) return FITTED;
  const [scale = 1, , , , tx = 0, ty = 0] = matrix.map(Number);
  return { scale, tx, ty };
};

export const tapAt = (x: number, y: number): Promise<void> =>
  act(() =>
    fireGestureHandler(getByGestureTestId("tap"), [
      { state: State.BEGAN, x, y },
      { state: State.ACTIVE, x, y },
      { state: State.END, x, y },
    ]),
  );

export const tapped = (room: Shown, id: string): Promise<void> => {
  const seat = room.auditorium.map.rows
    .flatMap((row) => row.seats)
    .find((held) => held.id === id);
  if (seat === undefined) throw new Error(`the room has no Seat ${id}`);
  const frame = frameOf(room.auditorium);
  const perUnit =
    Number(
      StyleSheet.flatten(screen.getByTestId("seat-map").props["style"]).width,
    ) / frame.width;
  const { scale, tx, ty } = drawnView();
  return tapAt(
    (scale * (seat.x + seat.width / 2 - frame.x) + tx) * perUnit,
    (scale * (seat.y + seat.height / 2 - frame.y) + ty) * perUnit,
  );
};

export const rowBar = (): ReturnType<typeof within> =>
  within(screen.getByTestId("row-bar"));

export const otherThan = (room: Shown): SeatGroupResult => {
  const other = room.auditorium.offered.find(
    ({ group }) => group.key !== room.result.key,
  )?.group;
  if (other === undefined) throw new Error("the room offers only one group");
  return other;
};

export const refusedIn = (room: Shown): PositionedSeat => {
  const seat = room.auditorium.map.rows
    .flatMap((row) => row.seats)
    .find((held) => !held.bookable);
  if (seat === undefined) throw new Error("every Seat in the room is bookable");
  return seat;
};

const QUERY = `movie=245893&date=${TODAY}&area=75006&partySize=2`;

export const listLink: string = `/?${QUERY}`;

export const roomLink = (showtime: number, group?: string): string =>
  `/room?${QUERY}&showtime=${showtime}${group === undefined ? "" : `&group=${encodeURIComponent(group)}`}`;
