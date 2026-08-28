declare const kind: unique symbol;

type Id<Name extends string, Raw = string> = Raw & { readonly [kind]: Name };

export type MovieId = Id<"movie">;

export type TheaterId = Id<"theater">;

export type ShowtimeId = Id<"showtime", number>;

export type TicketingUrl = Id<"ticketing">;

export type Format =
  | "3D"
  | "D-BOX"
  | "DFX"
  | "Dolby Atmos"
  | "Dolby Cinema"
  | "HDR by Barco"
  | "IMAX"
  | "IMAX with Laser"
  | "Laser"
  | "SDX"
  | "ScreenX"
  | "Sony Digital"
  | "The Big Show"
  | "XD"
  | "XL";

export interface Theater {
  readonly id: TheaterId;
  readonly name: string;
}

export interface Presentation {
  readonly movie: MovieId;
  readonly theater: Theater;
  readonly formats: readonly Format[];
}

export interface Showtime {
  readonly id: ShowtimeId;
  readonly startsAt: string;
  readonly presentation: Presentation;
  readonly ticketing: TicketingUrl;
}

export type UnbookableReason = "noSeatMap" | "started" | "soldOut";

export interface Unbookable {
  readonly showtime: Showtime;
  readonly reason: UnbookableReason;
}

export interface Catalogue {
  readonly bookable: readonly Showtime[];
  readonly unbookable: readonly Unbookable[];
}
