import type {
  PositionedSeat,
  SearchTerms,
  SeatGroupResult,
} from "@seatscout/client";
import {
  type CapturedRoom,
  type OpenedRoom,
  openedRooms,
  VILLAGE_1,
} from "@seatscout/view-logic/testing";
import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";
import { still } from "../../test/rooms.js";
import { Room } from "./room.js";

type Found = ReturnType<typeof screen.getByTestId>;

const TODAY = "2026-08-28";
const NOW = 13_000;
const STAGE = { x: 0, y: 0, width: 390, height: 760 };

export interface Shown extends OpenedRoom {
  readonly handedOff: readonly SeatGroupResult[];
  readonly left: readonly string[];
}

const ACCESSIBLE: SearchTerms = {
  movie: "245569",
  date: TODAY,
  area: "75006",
  partySize: 2,
  accessibleSeating: true,
};

export const shown = async (
  over: {
    readonly room?: CapturedRoom;
    readonly online?: boolean;
    readonly accessibleSeating?: boolean;
    readonly opening?: (opened: OpenedRoom) => SeatGroupResult;
  } = {},
): Promise<Shown> => {
  const [opened] = await openedRooms(
    over.accessibleSeating === true ? ACCESSIBLE : undefined,
    [over.room ?? VILLAGE_1],
  );
  if (opened === undefined) throw new Error("the room was never opened");
  const handedOff: SeatGroupResult[] = [];
  const left: string[] = [];

  await render(
    <Room
      auditorium={opened.auditorium}
      clock={still(NOW)}
      onBack={() => left.push("back")}
      onHandOff={(chosen) => handedOff.push(chosen)}
      online={over.online ?? true}
      opening={over.opening?.(opened) ?? opened.result}
      result={opened.result}
      today={TODAY}
    />,
  );
  await fireEvent(screen.getByTestId("scroll"), "layout", {
    nativeEvent: { layout: STAGE },
  });

  return { ...opened, handedOff, left };
};

export const seatsOnScreen = (): readonly string[] =>
  screen
    .getAllByLabelText(/^Seat [^ ]+\. /)
    .map((seat) => String(seat.props["accessibilityLabel"]));

export const seatNamed = (id: string): Found =>
  screen.getByLabelText(new RegExp(`^Seat ${id}\\. `));

export const rowBar = (): ReturnType<typeof within> =>
  within(screen.getByTestId("row-bar"));

export const otherThan = (room: Shown): SeatGroupResult => {
  const other = room.auditorium.offered.find(
    (group) => group.key !== room.result.key,
  );
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

const QUERY = "movie=245569&date=2026-08-28&area=75006&partySize=2";

export const listLink: string = `/?${QUERY}`;

export const roomLink = (showtime: number, group?: string): string =>
  `/room?${QUERY}&showtime=${showtime}${group === undefined ? "" : `&group=${encodeURIComponent(group)}`}`;
