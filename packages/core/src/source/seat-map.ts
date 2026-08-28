export interface UpstreamSeat {
  readonly id: string;
  readonly type: string;
  readonly status: string;
  readonly leftNeighbor: string;
  readonly rightNeighbor: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type Designation = "standard" | "wheelchair" | "companion";

interface Provenance {
  readonly source: "aggregator";
  readonly fetchedAt: number;
  readonly upstreamStatus: string;
}

export interface Seat {
  readonly id: string;
  readonly designation: Designation;
  readonly bookable: boolean;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly leftNeighbour: string | null;
  readonly rightNeighbour: string | null;
  readonly provenance: Provenance;
}

const BOOKABLE_STATUSES: readonly string[] = ["A"];

const ACCESSIBLE_DESIGNATIONS: Readonly<Record<string, Designation>> = {
  companion: "companion",
  wheelchair: "wheelchair",
};

const SEAT_FIELDS: Readonly<Record<keyof UpstreamSeat, "string" | "number">> = {
  id: "string",
  type: "string",
  status: "string",
  leftNeighbor: "string",
  rightNeighbor: "string",
  x: "number",
  y: "number",
  width: "number",
  height: "number",
};

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  value instanceof Object;

const isSeat = (value: unknown): value is UpstreamSeat =>
  isRecord(value) &&
  Object.entries(SEAT_FIELDS).every(
    ([field, kind]) => typeof value[field] === kind,
  );

const carriesSeats = (
  value: unknown,
): value is { readonly seats: readonly UpstreamSeat[] } =>
  isRecord(value) && Array.isArray(value.seats) && value.seats.every(isSeat);

const decoded = (body: string): { readonly value: unknown } | null => {
  try {
    return { value: JSON.parse(body) };
  } catch {
    return null;
  }
};

const linked = (neighbour: string) => (neighbour === "" ? null : neighbour);

const seatFrom = (seat: UpstreamSeat, fetchedAt: number): Seat => ({
  id: seat.id,
  designation: ACCESSIBLE_DESIGNATIONS[seat.type] ?? "standard",
  bookable: BOOKABLE_STATUSES.includes(seat.status),
  x: seat.x,
  y: seat.y,
  width: seat.width,
  height: seat.height,
  leftNeighbour: linked(seat.leftNeighbor),
  rightNeighbour: linked(seat.rightNeighbor),
  provenance: { source: "aggregator", fetchedAt, upstreamStatus: seat.status },
});

export const seatsFrom = (
  body: string,
  fetchedAt: number,
): readonly Seat[] | null => {
  const answer = decoded(body);
  if (answer === null || !carriesSeats(answer.value)) return null;
  return answer.value.seats.map((seat) => seatFrom(seat, fetchedAt));
};
