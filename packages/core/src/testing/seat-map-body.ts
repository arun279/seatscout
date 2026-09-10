interface SeatStatus {
  readonly id: string;
  readonly status: string;
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  value instanceof Object;

const isSeatStatus = (value: unknown): value is SeatStatus =>
  isRecord(value) &&
  typeof value["id"] === "string" &&
  typeof value["status"] === "string";

export const seatMapBodyWithStatuses = (
  body: string,
  statusOf: (seat: SeatStatus) => string | undefined,
) => {
  const value: unknown = JSON.parse(body);
  if (!isRecord(value) || !Array.isArray(value["seats"])) return body;
  return JSON.stringify({
    ...value,
    seats: value["seats"].map((seat) =>
      isSeatStatus(seat)
        ? { ...seat, status: statusOf(seat) ?? seat.status }
        : seat,
    ),
  });
};
