import type {
  Catalogue,
  Movie,
  Theater,
  UnbookableReason,
} from "../domain/catalogue.js";
import type { Seat } from "./seat-map.js";

export type Unreadable = Exclude<UnbookableReason, "salesOff"> | "unreachable";

export type Reading<Payload> =
  | {
      readonly ok: true;
      readonly payload: Payload;
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
  readonly theatersNear: (area: string) => Promise<Reading<readonly Theater[]>>;
  readonly moviesAt: (
    theater: string,
    date: string,
  ) => Promise<Reading<readonly Movie[]>>;
  readonly showtimesFor: (
    movie: string,
    date: string,
    area: string,
  ) => Promise<Reading<Catalogue>>;
  readonly seatsFor: (showtime: string) => Promise<Reading<readonly Seat[]>>;
}
