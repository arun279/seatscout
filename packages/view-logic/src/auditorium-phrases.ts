import type {
  Auditorium,
  AuditoriumMap,
  PositionedSeat,
  SeatGroupResult,
  SeatRow,
} from "@seatscout/client";
import {
  capitalised,
  clockOf,
  lateralOf,
  spokenOf,
  wordOf,
} from "./phrases.js";

type Accessible = Exclude<PositionedSeat["designation"], "standard">;

const TEENS = new Set([11, 12, 13]);

const SUFFIXES: Readonly<Record<number, string>> = {
  1: "st",
  2: "nd",
  3: "rd",
};

const ORDINALS = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
];

const KINDS: Readonly<Record<Accessible, string>> = {
  wheelchair: "Wheelchair space",
  companion: "Companion seat",
};

const GROUP_WORDS: Readonly<Record<number, readonly [string, string]>> = {
  1: ["seat", "seats"],
  2: ["pair", "pairs"],
};

const groupWordsOf = (partySize: number): readonly [string, string] =>
  GROUP_WORDS[partySize] ?? [
    `group of ${wordOf(partySize)}`,
    `groups of ${wordOf(partySize)}`,
  ];

export const ordinalOf = (count: number) => {
  const suffix = TEENS.has(count % 100) ? "th" : (SUFFIXES[count % 10] ?? "th");
  return `${count}${suffix}`;
};

const ordinalWordOf = (count: number) =>
  ORDINALS[count - 1] ?? ordinalOf(count);

const isAccessible = (
  seat: PositionedSeat,
): seat is PositionedSeat & { readonly designation: Accessible } =>
  seat.designation !== "standard";

const availabilityOf = (seat: PositionedSeat, accessibleSeating: boolean) => {
  if (!seat.bookable) return "Not bookable";
  return isAccessible(seat) && !accessibleSeating
    ? "Bookable, and kept out of ordinary results"
    : "Bookable";
};

const placeIn = (seat: PositionedSeat, recommended: readonly string[]) => {
  const at = recommended.indexOf(seat.id);
  return at === -1
    ? []
    : [
        `${capitalised(ordinalWordOf(at + 1))} of your ${wordOf(recommended.length)} recommended seats`,
      ];
};

export const seatNameOf = (
  seat: PositionedSeat,
  recommended: readonly string[],
  accessibleSeating: boolean,
) =>
  `${[
    `Seat ${seat.id}`,
    capitalised(lateralOf(seat.seatsOffCentre)),
    ...(isAccessible(seat) ? [KINDS[seat.designation]] : []),
    availabilityOf(seat, accessibleSeating),
    ...placeIn(seat, recommended),
  ].join(". ")}.`;

const bookableIn = (row: SeatRow) => {
  const seats = row.seats.length;
  if (row.bookableCount === seats) return `all ${seats} bookable`;
  return row.bookableCount === 0
    ? "none bookable"
    : `${row.bookableCount} bookable`;
};

export const rowTextOf = (row: SeatRow, map: AuditoriumMap) => {
  const accessible = row.seats.filter(isAccessible).length;
  const spaces =
    accessible === 0
      ? ""
      : `, ${accessible} of them wheelchair or companion spaces`;
  return `${ordinalOf(row.ordinalFromFront)} row of ${map.rows.length} from the front. ${row.seats.length} seats, ${bookableIn(row)}${spaces}.`;
};

export const gridLabelOf = (
  auditorium: Auditorium,
  result: SeatGroupResult,
) => {
  const { map } = auditorium;
  const { theater } = result.showtime.presentation;
  return `Seat map of ${theater.name} at ${clockOf(result.showtime.startsAt)}. ${map.seatCount} seats in ${map.rows.length} rows, ${map.bookableCount} bookable. Recommended: ${spokenOf(result)}, ${ordinalOf(result.reasons.rowFromFront)} row of ${result.reasons.rowCount}, ${lateralOf(result.reasons.seatsOffCentre)}. Arrow keys move one seat.`;
};

export const refusalOf = (
  seat: PositionedSeat,
  partySize: number,
  accessibleSeating: boolean,
): string => {
  if (!seat.bookable)
    return `Seat ${seat.id} is not bookable, so no seats together can include it.`;
  if (isAccessible(seat) && !accessibleSeating)
    return `Seat ${seat.id} is a ${KINDS[seat.designation].toLowerCase()}. Ask for accessible seating in the query to include it.`;
  return `No offered ${groupWordsOf(partySize)[0]} includes seat ${seat.id}.`;
};

export const chosenOf = (result: SeatGroupResult): string =>
  `${spokenOf(result)} chosen. ${result.seats.length === 1 ? "It is" : "They are"} re-checked when you continue.`;

export const groupsOf = (count: number, partySize: number): string => {
  const [one, many] = groupWordsOf(partySize);
  return count === 1
    ? `The only ${one} in this room.`
    : `${count} ${many} in this room. Choose a Seat on the map for any of them.`;
};
