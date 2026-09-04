import type { NormalisedPosition } from "./auditorium.js";

export const FETCHED_AT = 1000;

export const extentOf = (values: readonly number[]) => [
  Math.min(...values),
  Math.max(...values),
];

export const depthsOf = (auditorium: readonly NormalisedPosition[]) =>
  auditorium.map((seat) => seat.depth);

export const lateralsOf = (auditorium: readonly NormalisedPosition[]) =>
  auditorium.map((seat) => seat.lateral);
