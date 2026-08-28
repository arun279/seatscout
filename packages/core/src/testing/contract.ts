import { seatMapCaptures } from "../corpus/captures.js";
import { gapBetween, rowsOf } from "../domain/seat-group.js";
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

export interface Divergence {
  readonly kind:
    | "unreadable"
    | "missing"
    | "unexpected"
    | "status"
    | "type"
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

interface Side {
  readonly link: (seat: Seat) => string | null;
  readonly neighbour: (row: readonly Seat[], at: number) => Seat | undefined;
  readonly pair: (seat: Seat, neighbour: Seat) => readonly [Seat, Seat];
}

const SIDES: readonly Side[] = [
  {
    link: (seat) => seat.leftNeighbour,
    neighbour: (row, at) => row[at - 1],
    pair: (seat, neighbour) => [neighbour, seat],
  },
  {
    link: (seat) => seat.rightNeighbour,
    neighbour: (row, at) => row[at + 1],
    pair: (seat, neighbour) => [seat, neighbour],
  },
];

const recorded = (): Recorded => {
  const maps = [...seatMapCaptures.values()].map((capture) => capture.body);
  const seats = maps.flatMap((body) => body.seats);
  return {
    mapKeys: new Set(maps.flatMap((body) => Object.keys(body))),
    seatKeys: new Set(seats.flatMap((seat) => Object.keys(seat))),
    statuses: new Set(seats.map((seat) => seat.status)),
    types: new Set(seats.map((seat) => seat.type)),
  };
};

const decoded = (body: string): { readonly value: unknown } | null => {
  try {
    return { value: JSON.parse(body) };
  } catch {
    return null;
  }
};

const seatMapIn = (value: unknown): SeatMap | null =>
  value instanceof Object && "seats" in value && Array.isArray(value.seats)
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

const holds = (
  side: Side,
  row: readonly Seat[],
  seat: Seat,
  at: number,
): boolean => {
  const link = side.link(seat);
  if (link === null) return true;
  const neighbour = side.neighbour(row, at);
  return (
    neighbour !== undefined &&
    neighbour.id === link &&
    gapBetween(...side.pair(seat, neighbour)) === null
  );
};

const strayLinks = (seats: readonly Seat[]): readonly string[] =>
  rowsOf(seats).flatMap((row) =>
    row.flatMap((seat, at) =>
      SIDES.every((side) => holds(side, row, seat, at)) ? [] : [seat.id],
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
