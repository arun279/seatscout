import type { Coverage, Day, Snapshot } from "@seatscout/client";

export const covering = (candidates: number, checked: number): Coverage => ({
  started: [],
  noSeatMap: [],
  soldOut: [],
  salesOff: [],
  unidentified: [],
  failed: [],
  candidates,
  checked,
});

export const reading = (
  coverage: Coverage,
  phase: Snapshot["phase"],
  days: readonly Day[] = [],
  refused = false,
): Snapshot => ({
  results: [],
  coverage,
  phase,
  days,
  refused,
});

export const TODAY = "2026-08-28";
export const TOMORROW = "2026-08-29";

export const day = (
  date: string,
  read: number,
  reading: number,
  unread: number,
): Day => ({ date, read, reading, unread });
