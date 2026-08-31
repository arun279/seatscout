import { seatMapCaptures } from "../corpus/captures.js";
import { gapBetween, rowsOf } from "../domain/seat-group.js";
import { ON_SALE, sellabilityFrom, theatersFrom } from "../source/catalogue.js";
import { decoded, isRecord } from "../source/json.js";
import {
  fieldsMissingFrom,
  isUpstreamSeat,
  type Seat,
  seatFrom,
  type UpstreamSeat,
} from "../source/seat-map.js";

export interface Answer {
  readonly status: number;
  readonly body: string;
  readonly fetchedAt: number;
}

export const SETTLED_STATUSES: Readonly<Record<string, boolean>> = { H: false };

export interface Divergence {
  readonly kind:
    | "unreadable"
    | "missing"
    | "empty"
    | "unexpected"
    | "status"
    | "type"
    | "sellability"
    | "link";
  readonly name: string;
}

interface SeatMap {
  readonly keys: readonly string[];
  readonly seats: readonly unknown[];
}

interface Recorded {
  readonly mapKeys: ReadonlySet<string>;
  readonly seatKeys: ReadonlySet<string>;
  readonly statuses: ReadonlySet<string>;
  readonly types: ReadonlySet<string>;
}

const recorded = (): Recorded => {
  const maps = [...seatMapCaptures.values()].map((capture) => capture.body);
  const seats = maps.flatMap((body) => body.seats);
  return {
    mapKeys: new Set(maps.flatMap((body) => Object.keys(body))),
    seatKeys: new Set(seats.flatMap((seat) => Object.keys(seat))),
    statuses: new Set([
      ...seats.map((seat) => seat.status),
      ...Object.keys(SETTLED_STATUSES),
    ]),
    types: new Set(seats.map((seat) => seat.type)),
  };
};

const seatMapIn = (value: unknown): SeatMap | null =>
  isRecord(value) && Array.isArray(value.seats)
    ? { keys: Object.keys(value), seats: value.seats }
    : null;

const diverging = (
  kind: Divergence["kind"],
  names: readonly string[],
): readonly Divergence[] => [...new Set(names)].map((name) => ({ kind, name }));

const unexpectedKeys = (
  map: SeatMap,
  seats: readonly UpstreamSeat[],
  known: Recorded,
): readonly string[] => [
  ...map.keys.filter((key) => !known.mapKeys.has(key)),
  ...seats.flatMap((seat) =>
    Object.keys(seat).filter((key) => !known.seatKeys.has(key)),
  ),
];

const unrecorded = (
  seats: readonly UpstreamSeat[],
  read: (seat: UpstreamSeat) => string,
  known: ReadonlySet<string>,
): readonly string[] => seats.map(read).filter((word) => !known.has(word));

const contiguous = (left: Seat, right: Seat) =>
  gapBetween(left, right) === null;

const holdsLeft = (seat: Seat, before: Seat | undefined) =>
  seat.leftNeighbour === null ||
  (before !== undefined &&
    before.id === seat.leftNeighbour &&
    contiguous(before, seat));

const holdsRight = (seat: Seat, after: Seat | undefined) =>
  seat.rightNeighbour === null ||
  (after !== undefined &&
    after.id === seat.rightNeighbour &&
    contiguous(seat, after));

const strayLinks = (seats: readonly Seat[]): readonly string[] =>
  rowsOf(seats).flatMap((row) =>
    row.flatMap((seat, at) =>
      holdsLeft(seat, row[at - 1]) && holdsRight(seat, row[at + 1])
        ? []
        : [seat.id],
    ),
  );

export const divergencesIn = (answer: Answer): readonly Divergence[] => {
  if (answer.status !== 200) return [];
  const answered = decoded(answer.body);
  if (answered === null) return diverging("unreadable", ["json"]);
  const map = seatMapIn(answered.value);
  if (map === null) return diverging("missing", ["seats"]);
  const seats = map.seats.filter(isUpstreamSeat);
  if (seats.length !== map.seats.length)
    return diverging("missing", map.seats.flatMap(fieldsMissingFrom));

  const known = recorded();
  return [
    ...diverging("unexpected", unexpectedKeys(map, seats, known)),
    ...diverging(
      "status",
      unrecorded(seats, (seat) => seat.status, known.statuses),
    ),
    ...diverging(
      "type",
      unrecorded(seats, (seat) => seat.type, known.types),
    ),
    ...diverging(
      "link",
      strayLinks(seats.map((seat) => seatFrom(seat, answer.fetchedAt))),
    ),
  ];
};

export const areaDivergencesIn = (answer: Answer): readonly Divergence[] => {
  if (decoded(answer.body) === null) return diverging("unreadable", ["json"]);
  const theaters = theatersFrom(answer.body);
  if (theaters === null) return diverging("missing", ["theaters"]);
  return theaters.length === 0 ? diverging("empty", ["theaters"]) : [];
};

export const listingDivergencesIn = (answer: Answer): readonly Divergence[] => {
  if (decoded(answer.body) === null) return diverging("unreadable", ["json"]);
  const listed = sellabilityFrom(answer.body);
  if (listed === null) return diverging("missing", ["catalogue"]);
  if (listed.rows === 0) return diverging("empty", ["catalogue"]);
  return [
    ...diverging(
      "missing",
      listed.notRefused.includes(undefined) ? ["sellability"] : [],
    ),
    ...diverging(
      "sellability",
      listed.notRefused.flatMap((word) =>
        word !== undefined && word !== ON_SALE ? [word] : [],
      ),
    ),
  ];
};
