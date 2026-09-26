import type {
  Auditorium,
  AuditoriumMap,
  PositionedSeat,
  SeatGroupResult,
  SeatRow,
} from "@seatscout/client";
import {
  ageOf,
  capitalised,
  clockOf,
  labelOf,
  lateralOf,
  penaltiesOf,
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

export const mapLabelOf = (
  auditorium: Auditorium,
  result: SeatGroupResult,
): string => {
  const { map } = auditorium;
  const { theater } = result.showtime.presentation;
  return `Seat map of ${theater.name} at ${clockOf(result.showtime.startsAt)}. ${map.seatCount} seats in ${map.rows.length} rows, ${map.bookableCount} bookable. Recommended: ${spokenOf(result)}, ${ordinalOf(result.reasons.rowFromFront)} row of ${result.reasons.rowCount}, ${lateralOf(result.reasons.seatsOffCentre)}.`;
};

export const gridLabelOf = (
  auditorium: Auditorium,
  result: SeatGroupResult,
): string => `${mapLabelOf(auditorium, result)} Arrow keys move one seat.`;

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

export const BACK_TO_THE_LIST = "Back to the list";

export const YOUR_SEATS_IN_THIS_ROOM = "Your seats in this room";

export const CLEAR_OF_THE_FRONT = "Clear of the front rows and the walls";

export const UNCONFIRMED = "Not confirmed by a second source";

export const RE_CHECKED_ON_THE_TAP =
  "Availability is re-checked the instant you tap. SeatScout never holds seats.";

export const WAITS_FOR_THE_CONNECTION =
  "Continuing re-checks them with the Source, so it waits for the connection.";

export const backToOf = (result: SeatGroupResult): string =>
  `Back to ${result.seats.map((seat) => seat.id).join(" ")}`;

export const heldWhileOfflineOf = (chosen: SeatGroupResult): string =>
  `${spokenOf(chosen)} are here while you are offline.`;

export const notBookableIn = (map: AuditoriumMap): string =>
  `${map.seatCount - map.bookableCount} of ${map.seatCount} not bookable`;

export const readingOf = (fetchedAt: number, now: number): string =>
  `1 source · read ${ageOf(fetchedAt, now)} ago`;

export type Mark = "lit" | "forSale" | "notBookable" | "space" | "console";

export interface LegendEntry {
  readonly mark: Mark;
  readonly words: string;
}

export const legendOf = (
  chosen: SeatGroupResult,
  accessibleSeating: boolean,
  consoles: boolean,
): readonly LegendEntry[] => [
  { mark: "lit", words: `${labelOf(chosen)}, yours` },
  { mark: "forSale", words: "for sale" },
  { mark: "notBookable", words: "not bookable" },
  {
    mark: "space",
    words: `wheelchair or companion${accessibleSeating ? "" : ", kept out of ordinary results"}`,
  },
  ...(consoles ? [{ mark: "console" as const, words: "console" }] : []),
];

export const rowOf = (reasons: SeatGroupResult["reasons"]): string =>
  `Row ${reasons.rowFromFront} of ${reasons.rowCount}`;

export const creditsOf = (
  reasons: SeatGroupResult["reasons"],
  podDividers: number,
): readonly string[] => {
  const penalties = penaltiesOf(reasons, podDividers);
  return [
    capitalised(lateralOf(reasons.seatsOffCentre)),
    ...(penalties.length === 0
      ? [CLEAR_OF_THE_FRONT]
      : penalties.map(capitalised)),
  ];
};
