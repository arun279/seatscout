import type { Showtime } from "@seatscout/core";
import { seatMapsPerStep } from "./budget.js";

export interface Day {
  readonly date: string;
  readonly read: number;
  readonly reading: number;
  readonly unread: number;
}

export interface Listed {
  readonly showtime: Showtime;
  readonly date: string;
}

export type SeatMapState = "reading" | "read";

interface DayCounts {
  readonly list: (date: string, bookable: readonly Showtime[]) => void;
  readonly next: () => readonly Listed[];
  readonly mark: (entry: Listed, state: SeatMapState | undefined) => void;
  readonly days: () => readonly Day[];
}

export const openDays = (dates: readonly string[]): DayCounts => {
  const order: Listed[] = [];
  const asked = new Map<Showtime["id"], SeatMapState | undefined>();
  const perStep = seatMapsPerStep(dates.length);

  return {
    list: (date: string, bookable: readonly Showtime[]) => {
      order.push(...bookable.map((showtime) => ({ showtime, date })));
    },
    next: () =>
      order
        .filter(({ showtime }) => asked.get(showtime.id) === undefined)
        .slice(0, perStep),
    mark: (entry: Listed, state: SeatMapState | undefined) => {
      asked.set(entry.showtime.id, state);
    },
    days: () =>
      dates.map((date) => {
        const listed = order.filter((entry) => entry.date === date);
        const counted = (state: SeatMapState | undefined) =>
          listed.filter((entry) => asked.get(entry.showtime.id) === state)
            .length;
        return {
          date,
          read: counted("read"),
          reading: counted("reading"),
          unread: counted(undefined),
        };
      }),
  };
};
