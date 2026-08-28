import { seatMapCaptures } from "../corpus/captures.js";
import { gapBetween, rowsOf } from "../domain/seat-group.js";
import {
  fieldsMissingFrom,
  isUpstreamSeat,
  type Seat,
  seatsFrom,
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

interface Side {
  readonly link: (seat: Seat) => string | null;
  readonly neighbour: (row: readonly Seat[], at: number) => Seat | undefined;
  readonly pair: (seat: Seat, neighbour: Seat) => readonly [Seat, Seat];
}

const recordedMaps = [...seatMapCaptures.values()].map(
  (capture) => capture.body,
);
const recordedSeats = recordedMaps.flatMap((body) => body.seats);

const RECORDED_MAP_KEYS = new Set(
  recordedMaps.flatMap((body) => Object.keys(body)),
);
const RECORDED_SEAT_KEYS = new Set(
  recordedSeats.flatMap((seat) => Object.keys(seat)),
);
const RECORDED_STATUSES = new Set(recordedSeats.map((seat) => seat.status));
const RECORDED_TYPES = new Set(recordedSeats.map((seat) => seat.type));

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

const decoded = (body: string): { readonly value: unknown } | null => {
  try {
    return { value: JSON.parse(body) };
  } catch {
    return null;
  }
};

const diverging = (
  kind: Divergence["kind"],
  names: readonly string[],
): readonly Divergence[] => [...new Set(names)].map((name) => ({ kind, name }));

const keysOf = (value: unknown): readonly string[] =>
  value instanceof Object ? Object.keys(value) : [];

const seatsArrayIn = (value: unknown): readonly unknown[] | null =>
  value instanceof Object && "seats" in value && Array.isArray(value.seats)
    ? value.seats
    : null;

const upstreamSeatsIn = (value: unknown): readonly UpstreamSeat[] =>
  (seatsArrayIn(value) ?? []).filter(isUpstreamSeat);

const missing = (value: unknown): readonly Divergence[] => {
  const seats = seatsArrayIn(value);
  return diverging(
    "missing",
    seats === null ? ["seats"] : seats.flatMap(fieldsMissingFrom),
  );
};

const unexpectedKeys = (value: unknown): readonly string[] => [
  ...keysOf(value).filter((key) => !RECORDED_MAP_KEYS.has(key)),
  ...upstreamSeatsIn(value).flatMap((seat) =>
    Object.keys(seat).filter((key) => !RECORDED_SEAT_KEYS.has(key)),
  ),
];

const unrecorded = (
  value: unknown,
  read: (seat: UpstreamSeat) => string,
  recorded: ReadonlySet<string>,
): readonly string[] =>
  upstreamSeatsIn(value)
    .map(read)
    .filter((word) => !recorded.has(word));

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
  const seats = seatsFrom(answer.body, answer.fetchedAt);
  if (seats === null) return missing(answered.value);
  return [
    ...diverging("unexpected", unexpectedKeys(answered.value)),
    ...diverging(
      "status",
      unrecorded(answered.value, (seat) => seat.status, RECORDED_STATUSES),
    ),
    ...diverging(
      "type",
      unrecorded(answered.value, (seat) => seat.type, RECORDED_TYPES),
    ),
    ...diverging("link", strayLinks(seats)),
  ];
};
