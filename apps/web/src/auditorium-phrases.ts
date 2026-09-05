import type {
  Auditorium,
  AuditoriumMap,
  PositionedSeat,
  SeatGroupResult,
  SeatRow,
} from "@seatscout/client";
import { capitalised, clockOf, lateralOf, wordOf } from "./phrases.js";

type Accessible = Exclude<PositionedSeat["designation"], "standard">;

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

const GROUP_WORDS: Readonly<Record<number, string>> = { 1: "seat", 2: "pair" };

const groupWordOf = (partySize: number) =>
  GROUP_WORDS[partySize] ?? wordOf(partySize);

export const ordinalOf = (count: number) => {
  const rest = count % 100;
  const suffix = rest > 10 && rest < 14 ? "th" : (SUFFIXES[count % 10] ?? "th");
  return `${count}${suffix}`;
};

const ordinalWordOf = (count: number) =>
  ORDINALS[count - 1] ?? ordinalOf(count);

const listOf = (ids: readonly string[]) =>
  ids.length < 2
    ? ids.join("")
    : `${ids.slice(0, -1).join(", ")} and ${ids.at(-1)}`;

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
  return `Seat map of ${theater.name} at ${clockOf(result.showtime.startsAt)}. ${map.seatCount} seats in ${map.rows.length} rows, ${map.bookableCount} bookable. Recommended: ${listOf(result.seats.map((seat) => seat.id))}, ${ordinalOf(result.reasons.rowFromFront)} row of ${result.reasons.rowCount}, ${lateralOf(result.reasons.seatsOffCentre)}. Arrow keys move one seat.`;
};

export const refusalOf = (
  seat: PositionedSeat,
  partySize: number,
  accessibleSeating: boolean,
) => {
  if (!seat.bookable)
    return `Seat ${seat.id} is not bookable, so no seats together can include it.`;
  if (isAccessible(seat) && !accessibleSeating)
    return `Seat ${seat.id} is a ${KINDS[seat.designation].toLowerCase()}. Ask for accessible seating in the query to include it.`;
  return `No offered ${groupWordOf(partySize)} includes seat ${seat.id}.`;
};

export const chosenOf = (result: SeatGroupResult) =>
  `${listOf(result.seats.map((seat) => seat.id))} chosen. ${result.seats.length === 1 ? "It is" : "They are"} re-checked when you continue.`;

export const groupsOf = (count: number, partySize: number) => {
  const word = groupWordOf(partySize);
  return count === 1
    ? `The only ${word} in this room.`
    : `${count} ${word}s in this room.`;
};
