import {
  type Auditorium,
  createSeatScout,
  type SearchTerms,
  type SeatGroupResult,
} from "@seatscout/client";
import {
  fakeUpstream,
  routeOf,
  seatMapCaptures,
  type UpstreamScript,
} from "@seatscout/client/testing";

export interface CapturedRoom {
  readonly name: string;
  readonly showtime: number;
  readonly capture: string;
  readonly seats: string;
  readonly card: string;
}

export const WEST_PLANO_28: CapturedRoom = {
  name: "Cinemark West Plano 28, 304 seats in 14 rows",
  showtime: 557962494,
  capture: "561865199",
  seats: "H14·H13",
  card: "Cinemark Frisco Square and XD, 10:10p",
};

export const ANGELIKA_5: CapturedRoom = {
  name: "Angelika 5, 300 seats in 15 rows",
  showtime: 558016663,
  capture: "561230736",
  seats: "L11·L10",
  card: "Cinemark West Plano and XD, 6:40p",
};

export const VILLAGE_1: CapturedRoom = {
  name: "AMC Village on the Parkway 1, 294 seats, row 5 mixing E18 with WC17",
  showtime: 557962491,
  capture: "561462741",
  seats: "G14·G13",
  card: "Cinemark Frisco Square and XD, 1:25p",
};

export const LAKE_HIGHLANDS_1: CapturedRoom = {
  name: "Alamo Lake Highlands 1, 155 seats numbered 101 to 919",
  showtime: 557805659,
  capture: "561505814",
  seats: "608·609",
  card: "AMC Highland Village 12, 8:00p",
};

export const STRIKE_AND_REEL_1: CapturedRoom = {
  name: "Strike + Reel 1, 46 seats in 5 rows",
  showtime: 557843159,
  capture: "561443587",
  seats: "D8·D7",
  card: "AMC Grapevine Mills 24, 9:00p",
};

const FIVE_ROOMS: readonly CapturedRoom[] = [
  WEST_PLANO_28,
  ANGELIKA_5,
  VILLAGE_1,
  LAKE_HIGHLANDS_1,
  STRIKE_AND_REEL_1,
];

const SEAT_MAP = "/napi/seatMap/";

const CORPUS_QUERY: SearchTerms = {
  movie: "245569",
  date: "2026-08-28",
  area: "75006",
  partySize: 2,
  accessibleSeating: false,
};

const capturedBody = (capture: string) => {
  const captured = [...seatMapCaptures.values()].find(
    (room) => routeOf(room.request.path) === `${SEAT_MAP}${capture}`,
  );
  if (captured === undefined) throw new Error(`${capture} was never captured`);
  return { status: captured.status, body: JSON.stringify(captured.body) };
};

export const roomRoutes = (
  rooms: readonly CapturedRoom[] = FIVE_ROOMS,
): NonNullable<UpstreamScript["routes"]> =>
  Object.fromEntries(
    rooms.map((room) => [
      `${SEAT_MAP}${room.showtime}`,
      capturedBody(room.capture),
    ]),
  );

export interface OpenedRoom {
  readonly room: CapturedRoom;
  readonly result: SeatGroupResult;
  readonly auditorium: Auditorium;
}

export const openedRooms = async (
  terms: SearchTerms = CORPUS_QUERY,
): Promise<readonly OpenedRoom[]> => {
  const seatscout = createSeatScout({
    fetch: fakeUpstream({
      seed: 4,
      standInAuditoriums: true,
      routes: roomRoutes(),
    }),
    now: () => 1000,
    wait: () => Promise.resolve(),
    random: () => 0.5,
  });
  const search = seatscout.search(terms);
  const settled = await search.done;
  return FIVE_ROOMS.map((room) => {
    const result = settled.results.find(
      (found) => found.showtime.id === room.showtime,
    );
    if (result === undefined) throw new Error(`${room.name} offered nothing`);
    return { room, result, auditorium: search.auditorium(result) };
  });
};

export const labelAt = (
  auditorium: Auditorium,
  place: { readonly row: number; readonly seat: number },
) => auditorium.map.rows[place.row]?.seats[place.seat]?.id;
