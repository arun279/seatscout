import { createSeatScout } from "@seatscout/client";
import type {
  Auditorium,
  Search,
  SearchTerms,
  SeatGroupResult,
  Snapshot,
} from "@seatscout/client";
import {
  fakeUpstream,
  readToTheEnd,
  routeOf,
  seatMapCaptures,
  type UpstreamScript,
} from "@seatscout/client/testing";

export interface CapturedRoom {
  readonly name: string;
  readonly showtime: number;
  readonly capture: string;
  readonly seats: string;
  readonly spoken: string;
  readonly card: string;
}

export const WEST_PLANO_10: CapturedRoom = {
  name: "Cinemark West Plano 10, 303 seats in 14 rows",
  showtime: 564644951,
  capture: "562212808",
  seats: "N14·N13",
  spoken: "N14 and N13",
  card: "Cinemark Frisco Square and XD, 8:00p",
};

export const ANGELIKA_5: CapturedRoom = {
  name: "Angelika 5, 300 seats in 15 rows",
  showtime: 564402231,
  capture: "564402231",
  seats: "K11·K10",
  spoken: "K11 and K10",
  card: "Angelika Film Center & Cafe, 10:00a",
};

export const VILLAGE_1: CapturedRoom = {
  name: "AMC Village on the Parkway 1, 294 seats, row 5 mixing E18 with WC17",
  showtime: 562247516,
  capture: "562247516",
  seats: "D18·D17",
  spoken: "D18 and D17",
  card: "AMC Village on the Parkway 9, 2:00p",
};

export const CEDARS_3: CapturedRoom = {
  name: "Alamo Cedars 3, 155 seats numbered 101 to 919",
  showtime: 561434193,
  capture: "564216396",
  seats: "608·609",
  spoken: "608 and 609",
  card: "AMC Highland Village 12, 8:30p",
};

export const STRIKE_AND_REEL_4: CapturedRoom = {
  name: "Strike + Reel 4, 123 seats in 8 rows",
  showtime: 562687836,
  capture: "559982630",
  seats: "G10·G9",
  spoken: "G10 and G9",
  card: "Strike + Reel Luxury Dine-In and XD, 10:35a",
};

export const HOOKY_SOUTHLAKE: CapturedRoom = {
  name: "Hooky Southlake, 10 rows with consoles in two of them and 31 Seat Groups",
  showtime: 564445998,
  capture: "564445998",
  seats: "H14·H13",
  spoken: "H14 and H13",
  card: "Hooky Entertainment Southlake + SDX, 10:40a",
};

const FIVE_ROOMS: readonly CapturedRoom[] = [
  WEST_PLANO_10,
  ANGELIKA_5,
  VILLAGE_1,
  CEDARS_3,
  STRIKE_AND_REEL_4,
];

const SEAT_MAP = "/napi/seatMap/";

const CORPUS_QUERY: SearchTerms = {
  movie: "245893",
  dates: ["2026-09-20"],
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

const DRAWN_ROOMS: readonly CapturedRoom[] = [...FIVE_ROOMS, HOOKY_SOUTHLAKE];

export const roomRoutes = (
  rooms: readonly CapturedRoom[] = DRAWN_ROOMS,
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
  readonly search: Search;
}

export const searched = async (
  terms: SearchTerms = CORPUS_QUERY,
): Promise<{ readonly search: Search; readonly settled: Snapshot }> => {
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
  return { search, settled: await readToTheEnd(search) };
};

export const openedRooms = async (
  terms: SearchTerms = CORPUS_QUERY,
  rooms: readonly CapturedRoom[] = FIVE_ROOMS,
): Promise<readonly OpenedRoom[]> => {
  const { search, settled } = await searched(terms);
  return rooms.map((room) => {
    const result = settled.results.find(
      (found) => found.showtime.id === room.showtime,
    );
    if (result === undefined) throw new Error(`${room.name} offered nothing`);
    return { room, result, auditorium: search.auditorium(result), search };
  });
};
