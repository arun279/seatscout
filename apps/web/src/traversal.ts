import {
  type Auditorium,
  type AuditoriumMap,
  nearestInRow,
  type PositionedSeat,
  type SeatRow,
} from "@seatscout/client";

export interface Place {
  readonly row: number;
  readonly seat: number;
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

export const rowAt = (map: AuditoriumMap, row: number): SeatRow => {
  const found = map.rows[row];
  if (found === undefined) throw new Error(`no row ${row}`);
  return found;
};

export const seatAt = (map: AuditoriumMap, place: Place): PositionedSeat => {
  const seat = rowAt(map, place.row).seats[place.seat];
  if (seat === undefined)
    throw new Error(`no Seat at row ${place.row}, seat ${place.seat}`);
  return seat;
};

export const placed = (map: AuditoriumMap, place: Place): Cursor => ({
  ...place,
  anchor: seatAt(map, place).lateral,
});

const sideways = (map: AuditoriumMap, cursor: Cursor, step: number) => {
  const seat = cursor.seat + step;
  return rowAt(map, cursor.row).seats[seat] === undefined
    ? cursor
    : placed(map, { row: cursor.row, seat });
};

const vertical = (map: AuditoriumMap, cursor: Cursor, row: number) => {
  const found = map.rows[row];
  return found === undefined
    ? cursor
    : { row, seat: nearestInRow(found, cursor.anchor), anchor: cursor.anchor };
};

const STEPS: Readonly<Record<Move, Step>> = {
  ArrowRight: (map, cursor) => sideways(map, cursor, 1),
  ArrowLeft: (map, cursor) => sideways(map, cursor, -1),
  ArrowDown: (map, cursor) => vertical(map, cursor, cursor.row + 1),
  ArrowUp: (map, cursor) => vertical(map, cursor, cursor.row - 1),
  Home: (map, cursor, ctrl) =>
    placed(map, { row: ctrl ? 0 : cursor.row, seat: 0 }),
  End: (map, cursor, ctrl) => {
    const row = ctrl ? map.rows.length - 1 : cursor.row;
    return placed(map, { row, seat: rowAt(map, row).seats.length - 1 });
  },
  PageUp: (map, cursor) => vertical(map, cursor, 0),
  PageDown: (map, cursor) => vertical(map, cursor, map.rows.length - 1),
};

export const moved = (
  map: AuditoriumMap,
  cursor: Cursor,
  move: Move,
  ctrl: boolean,
): Cursor => STEPS[move](map, cursor, ctrl);

export const opened = (auditorium: Auditorium): Cursor =>
  placed(auditorium.map, {
    row: auditorium.recommended.row,
    seat: Math.min(...auditorium.recommended.seats),
  });
