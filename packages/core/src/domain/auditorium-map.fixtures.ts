import { seatMapCaptures } from "../corpus/captures.js";
import type { CapturedSeatMap } from "../corpus/types.js";
import { seatsFrom } from "../source/seat-map.js";
import type { PositionedSeat } from "./auditorium-map.js";

export const FETCHED_AT = 1000;

export const ascending = (values: readonly number[]) =>
  [...new Set(values)].sort((first, second) => first - second);

export const lateralsOf = (seats: readonly PositionedSeat[]) =>
  seats.map((seat) => seat.lateral);

export const capturedSeatMaps = () =>
  [...seatMapCaptures.values()].map((capture) => capture.body);

export const seatsOf = (body: CapturedSeatMap) => {
  const seats = seatsFrom(JSON.stringify(body), FETCHED_AT);
  if (seats === null)
    throw new Error(
      `the corpus seat map for showtime ${body.showtimeId} does not read`,
    );
  return seats;
};

export const capturedSeatMap = (showtime: string) => {
  const body = capturedSeatMaps().find((map) => map.showtimeId === showtime);
  if (body === undefined)
    throw new Error(`the corpus holds no seat map for showtime ${showtime}`);
  return body;
};
