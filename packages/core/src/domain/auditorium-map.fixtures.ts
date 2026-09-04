import type { PositionedSeat } from "./auditorium-map.js";

export const FETCHED_AT = 1000;

export const ascending = (values: readonly number[]) =>
  [...new Set(values)].sort((first, second) => first - second);

export const lateralsOf = (seats: readonly PositionedSeat[]) =>
  seats.map((seat) => seat.lateral);
