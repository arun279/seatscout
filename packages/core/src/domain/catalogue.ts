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

export const EVERY_AMENITY = [
  "Accessibility Devices",
  "Closed Captioning",
  "Dine-In",
  "Recliners",
] as const satisfies readonly Amenity[];

export const EVERY_CHAIN = [
  "AMC",
  "Alamo Drafthouse Cinemas",
  "Angelika Film Center",
  "Cinemark Theatres",
  "Cinepolis",
  "Galaxy Theatres",
  "Hooky Entertainment",
  "Landmark",
  "Studio Movie Grill",
] as const satisfies readonly Chain[];

export const EVERY_FORMAT = [
  "3D",
  "D-BOX",
  "DFX",
  "Dolby Atmos",
  "Dolby Cinema",
  "HDR by Barco",
  "IMAX",
  "IMAX with Laser",
  "Laser",
  "SDX",
  "ScreenX",
  "Sony Digital",
  "The Big Show",
  "XD",
  "XL",
] as const satisfies readonly Format[];

export interface Theater {
  readonly id: TheaterId;
  readonly name: string;
  readonly chain?: Chain;
}

export interface Movie {
  readonly id: string;
  readonly title: string;
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
  readonly theaters?: readonly string[];
  readonly chains?: readonly Chain[];
  readonly formats?: readonly Format[];
  readonly amenities?: readonly Amenity[];
  readonly from?: string;
  readonly until?: string;
}

const CLOCK_ON_THE_DATE = "2026-08-28T19:20".length;

const within = (
  at: string,
  from: string | undefined,
  until: string | undefined,
) => (from === undefined || at >= from) && (until === undefined || at < until);

const satisfied = <Term>(
  asked: readonly Term[] | undefined,
  matches: (term: Term) => boolean,
) => asked === undefined || asked.some(matches);

const admits =
  (terms: ShowtimeTerms) =>
  ({ presentation, startsAt }: Showtime | Unidentified) =>
    satisfied(terms.theaters, (id) => id === presentation.theater.id) &&
    satisfied(terms.chains, (chain) => chain === presentation.theater.chain) &&
    satisfied(terms.formats, (format) =>
      presentation.formats.includes(format),
    ) &&
    satisfied(terms.amenities, (amenity) =>
      presentation.amenities.includes(amenity),
    ) &&
    within(startsAt.slice(0, CLOCK_ON_THE_DATE), terms.from, terms.until);

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
