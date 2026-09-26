import {
  type Auditorium,
  type AuditoriumMap,
  nearestInRow,
  type PositionedSeat,
  REFERENCE,
  type SeatGroupResult,
  type SeatRow,
} from "@seatscout/client";
import type { Box } from "./gesture.js";

export interface Frame extends Box {
  readonly seatWidth: number;
}

export type SeatState = "lit" | "bookable" | "unbookable";

const ALTERNATES_SHOWN = 3;

export const frameOf = (auditorium: Auditorium): Frame => {
  const seats = auditorium.map.rows.flatMap((row) => row.seats);
  const seatWidth = Math.max(...seats.map((seat) => seat.width));
  const left = Math.min(...seats.map((seat) => seat.x)) - 1.6 * seatWidth;
  const top = Math.min(...seats.map((seat) => seat.y)) - 0.5 * seatWidth;
  return {
    x: left,
    y: top,
    width:
      Math.max(...seats.map((seat) => seat.x + seat.width)) -
      left +
      0.5 * seatWidth,
    height:
      Math.max(...seats.map((seat) => seat.y + seat.height)) -
      top +
      0.5 * seatWidth,
    seatWidth,
  };
};

export const holds = (group: SeatGroupResult, seat: PositionedSeat): boolean =>
  group.seats.some((held) => held.id === seat.id);

export const stateOf = (seat: PositionedSeat, lit: boolean): SeatState => {
  if (lit) return "lit";
  return seat.bookable ? "bookable" : "unbookable";
};

export const offeredIn = (auditorium: Auditorium): ReadonlySet<string> =>
  new Set(
    auditorium.offered.flatMap((group) => group.seats.map((seat) => seat.id)),
  );

export const groupHolding = (
  auditorium: Auditorium,
  seat: PositionedSeat,
): SeatGroupResult | undefined =>
  auditorium.offered.find((offered) => holds(offered, seat));

export const consolesIn = (map: AuditoriumMap): boolean =>
  map.rows.some((row) => row.gapAfter.includes("pod"));

export interface Divider {
  readonly x: number;
  readonly y1: number;
  readonly y2: number;
}

export const dividersIn = (row: SeatRow): readonly Divider[] =>
  row.seats.flatMap((left, at) => {
    const right = row.seats[at + 1];
    return row.gapAfter[at] === "pod" && right !== undefined
      ? [
          {
            x: (left.x + left.width + right.x) / 2,
            y1: left.y + 0.2 * left.height,
            y2: left.y + 0.8 * left.height,
          },
        ]
      : [];
  });

export const aimedAt = (result: SeatGroupResult, map: AuditoriumMap): Box => {
  const { targetDepth, targetLateral } = result.terms.profile ?? REFERENCE;
  const row = map.rows.reduce((nearest, held) =>
    Math.abs(held.depth - targetDepth) < Math.abs(nearest.depth - targetDepth)
      ? held
      : nearest,
  );
  const seat = nearestInRow(row, targetLateral);
  return { x: seat.x, y: seat.y, width: seat.width, height: seat.height };
};

export const shownIn = (
  auditorium: Auditorium,
  result: SeatGroupResult,
  chosen: SeatGroupResult,
): readonly SeatGroupResult[] => {
  const shown = [
    result,
    ...auditorium.offered
      .filter((offered) => offered.key !== result.key)
      .slice(0, ALTERNATES_SHOWN),
  ];
  return shown.some((offered) => offered.key === chosen.key)
    ? shown
    : [...shown, chosen];
};
