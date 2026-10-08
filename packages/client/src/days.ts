import type { Showtime } from "@seatscout/core";

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

const inTurn = (bookable: readonly Showtime[]): Showtime[] => {
  const taken = new Map<Showtime["presentation"]["theater"]["id"], number>();
  return bookable
    .map((showtime) => {
      const theater = showtime.presentation.theater.id;
      const turn = taken.get(theater) ?? 0;
      taken.set(theater, turn + 1);
      return { showtime, turn };
    })
    .sort((left, right) => left.turn - right.turn)
    .map(({ showtime }) => showtime);
};

export const openDays = (
  dates: readonly string[],
  perStep: number,
): DayCounts => {
  const order: Listed[] = [];
  const asked = new Map<Showtime["id"], SeatMapState | undefined>();

  return {
    list: (date: string, bookable: readonly Showtime[]) => {
      order.push(...inTurn(bookable).map((showtime) => ({ showtime, date })));
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
