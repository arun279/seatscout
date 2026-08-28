export interface Placement {
  readonly x: number;
  readonly y: number;
  readonly width: number;
}

export interface NormalisedPosition {
  readonly depth: number;
  readonly lateral: number;
}

const centreOf = (seat: Placement) => seat.x + seat.width / 2;

const rowsOf = (seats: readonly Placement[]) =>
  [...new Set(seats.map((seat) => seat.y))].sort(
    (nearer, further) => nearer - further,
  );

const lateralOf = (centre: number, left: number, right: number) => {
  const fromLeft = centre - left;
  const fromRight = right - centre;
  return left === right ? 0 : (fromLeft - fromRight) / (right - left);
};

export const normalised = <T extends Placement>(
  seats: readonly T[],
): readonly (T & NormalisedPosition)[] => {
  const rows = rowsOf(seats);
  const centres = seats.map(centreOf);
  const back = rows.length - 1;
  const left = Math.min(...centres);
  const right = Math.max(...centres);

  return seats.map((seat) => ({
    ...seat,
    depth: back === 0 ? 0 : rows.indexOf(seat.y) / back,
    lateral: lateralOf(centreOf(seat), left, right),
  }));
};
