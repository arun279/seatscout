import {
  type Auditorium,
  type AuditoriumMap,
  nearestInRow,
  type PositionedSeat,
  type SeatRow,
} from "@seatscout/client";

export interface Place {
  readonly row: SeatRow;
  readonly seat: PositionedSeat;
}

export interface Cursor extends Place {
  readonly anchor: number;
}

const MOVES = [
  "ArrowRight",
  "ArrowLeft",
  "ArrowDown",
  "ArrowUp",
  "Home",
  "End",
  "PageUp",
  "PageDown",
] as const;

export type Move = (typeof MOVES)[number];

type Step = (map: AuditoriumMap, cursor: Cursor, ctrl: boolean) => Cursor;

export const isMove = (key: string): key is Move =>
  MOVES.some((move) => move === key);

export const placed = (place: Place): Cursor => ({
  ...place,
  anchor: place.seat.lateral,
});

const onto = (
  cursor: Cursor,
  row: SeatRow | undefined,
  along: (row: SeatRow) => PositionedSeat | undefined,
): Cursor => {
  const seat = row === undefined ? undefined : along(row);
  return row === undefined || seat === undefined
    ? cursor
    : placed({ row, seat });
};

const alongRow = (cursor: Cursor, step: number) =>
  onto(
    cursor,
    cursor.row,
    (row) => row.seats[row.seats.indexOf(cursor.seat) + step],
  );

const acrossRows = (map: AuditoriumMap, cursor: Cursor, to: number): Cursor => {
  const row = map.rows[to];
  return row === undefined
    ? cursor
    : { row, seat: nearestInRow(row, cursor.anchor), anchor: cursor.anchor };
};

const rowOf = (map: AuditoriumMap, cursor: Cursor) =>
  map.rows.indexOf(cursor.row);

const first = (row: SeatRow) => row.seats[0];
const last = (row: SeatRow) => row.seats[row.seats.length - 1];

const STEPS: Readonly<Record<Move, Step>> = {
  ArrowRight: (_map, cursor) => alongRow(cursor, 1),
  ArrowLeft: (_map, cursor) => alongRow(cursor, -1),
  ArrowDown: (map, cursor) => acrossRows(map, cursor, rowOf(map, cursor) + 1),
  ArrowUp: (map, cursor) => acrossRows(map, cursor, rowOf(map, cursor) - 1),
  Home: (map, cursor, ctrl) =>
    onto(cursor, ctrl ? map.rows[0] : cursor.row, first),
  End: (map, cursor, ctrl) =>
    onto(cursor, ctrl ? map.rows[map.rows.length - 1] : cursor.row, last),
  PageUp: (map, cursor) => acrossRows(map, cursor, 0),
  PageDown: (map, cursor) => acrossRows(map, cursor, map.rows.length - 1),
};

export const moved = (
  map: AuditoriumMap,
  cursor: Cursor,
  move: Move,
  ctrl: boolean,
): Cursor => STEPS[move](map, cursor, ctrl);

export const opened = (auditorium: Auditorium): Cursor =>
  placed(auditorium.recommended);
