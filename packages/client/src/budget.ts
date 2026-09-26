export const SEAT_MAP_BUDGET = 48;

export const seatMapsPerStep = (days: number): number =>
  days > 1 ? SEAT_MAP_BUDGET : Number.POSITIVE_INFINITY;
