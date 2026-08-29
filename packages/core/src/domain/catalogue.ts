declare const kind: unique symbol;

type Id<Name extends string, Raw = string> = Raw & { readonly [kind]: Name };

export type MovieId = Id<"movie">;

export type TheaterId = Id<"theater">;

export type ShowtimeId = Id<"showtime", number>;

export type TicketingUrl = Id<"ticketing">;

export type Amenity =
  | "Accessibility Devices"
  | "Closed Captioning"
  | "Dine-In"
  | "Recliners";

export type Chain =
  | "AMC"
  | "Alamo Drafthouse Cinemas"
  | "Angelika Film Center"
  | "Cinemark Theatres"
  | "Cinepolis"
  | "Galaxy Theatres"
  | "Hooky Entertainment"
  | "Landmark"
  | "Studio Movie Grill";

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
  readonly chain?: Chain;
}

export interface Presentation {
  readonly movie: MovieId;
  readonly theater: Theater;
  readonly formats: readonly Format[];
  readonly amenities: readonly Amenity[];
}

export interface Showtime {
  readonly id: ShowtimeId;
  readonly startsAt: string;
  readonly presentation: Presentation;
  readonly ticketing: TicketingUrl;
}

export type Unidentified = Omit<Showtime, "id"> & { readonly id?: never };

export type UnbookableReason = "noSeatMap" | "started" | "soldOut" | "salesOff";

export interface Unbookable {
  readonly showtime: Showtime | Unidentified;
  readonly reason: UnbookableReason;
}

export interface Catalogue {
  readonly bookable: readonly Showtime[];
  readonly unbookable: readonly Unbookable[];
  readonly unidentified: readonly Unidentified[];
}

export interface ShowtimeTerms {
  readonly theaters?: readonly TheaterId[];
  readonly chains?: readonly Chain[];
  readonly formats?: readonly Format[];
  readonly amenities?: readonly Amenity[];
  readonly from?: number;
  readonly until?: number;
}

const within = (
  at: number,
  from: number | undefined,
  until: number | undefined,
) => (from === undefined || at >= from) && (until === undefined || at < until);

const oneOf = <Term>(
  asked: readonly Term[] | undefined,
  carried: Term | undefined,
) => asked === undefined || (carried !== undefined && asked.includes(carried));

const anyOf = <Term>(
  asked: readonly Term[] | undefined,
  carried: readonly Term[],
) => asked === undefined || asked.some((term) => carried.includes(term));

const admits =
  (terms: ShowtimeTerms) =>
  ({ presentation, startsAt }: Showtime | Unidentified) =>
    oneOf(terms.theaters, presentation.theater.id) &&
    oneOf(terms.chains, presentation.theater.chain) &&
    anyOf(terms.formats, presentation.formats) &&
    anyOf(terms.amenities, presentation.amenities) &&
    within(Date.parse(startsAt), terms.from, terms.until);

export const narrowed = (
  catalogue: Catalogue,
  terms: ShowtimeTerms,
): Catalogue => {
  const admitted = admits(terms);
  return {
    bookable: catalogue.bookable.filter(admitted),
    unbookable: catalogue.unbookable.filter((entry) =>
      admitted(entry.showtime),
    ),
    unidentified: catalogue.unidentified.filter(admitted),
  };
};
