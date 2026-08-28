export type Unreadable = "noSeatMap" | "started" | "soldOut" | "unreachable";

export type Reading =
  | {
      readonly ok: true;
      readonly payload: string;
      readonly fetchedAt: number;
      readonly attempts: number;
    }
  | {
      readonly ok: false;
      readonly reason: Unreadable;
      readonly fetchedAt: number;
      readonly attempts: number;
    };

export interface Source {
  readonly theatersNear: (area: string) => Promise<Reading>;
  readonly showtimesFor: (
    movie: string,
    date: string,
    area: string,
  ) => Promise<Reading>;
  readonly seatsFor: (showtime: string) => Promise<Reading>;
}
