import type {
  Amenity,
  Catalogue,
  Chain,
  Format,
  MovieId,
  Presentation,
  Showtime,
  ShowtimeId,
  Theater,
  TheaterId,
  TicketingUrl,
  Unbookable,
  UnbookableReason,
  Unidentified,
} from "../domain/catalogue.js";
import { decoded, isRecord } from "./json.js";

interface UpstreamNamedTheater {
  readonly formattedID: TheaterId;
  readonly name: string;
  readonly chainCode?: string;
}

interface UpstreamAmenity {
  readonly name: string;
}

interface UpstreamShowtime {
  readonly id?: ShowtimeId;
  readonly type?: string;
  readonly dateLocal: string;
  readonly expired: boolean;
  readonly isSoldOut: boolean;
  readonly ticketingJumpPageURL: TicketingUrl;
}

interface UpstreamAmenityGroup {
  readonly amenities: readonly UpstreamAmenity[];
  readonly hasReservedSeating: boolean;
  readonly movieID: MovieId;
  readonly showtimes: readonly UpstreamShowtime[];
}

interface UpstreamVariant {
  readonly amenityGroups: readonly UpstreamAmenityGroup[];
}

interface UpstreamTheater extends UpstreamNamedTheater {
  readonly variants: readonly UpstreamVariant[];
}

interface Listing {
  readonly showtime: Showtime | Unidentified;
  readonly reason: UnbookableReason | null;
  readonly sellability: string | undefined;
}

export interface Sellability {
  readonly rows: number;
  readonly notRefused: readonly (string | undefined)[];
}

type Kind = "boolean" | "number" | "string";

const THEATER_FIELDS: Readonly<
  Record<Exclude<keyof UpstreamNamedTheater, "chainCode">, Kind>
> = {
  formattedID: "string",
  name: "string",
};

const AMENITY_FIELDS: Readonly<Record<keyof UpstreamAmenity, Kind>> = {
  name: "string",
};

const GROUP_FIELDS: Readonly<Record<"hasReservedSeating" | "movieID", Kind>> = {
  hasReservedSeating: "boolean",
  movieID: "string",
};

const SHOWTIME_FIELDS: Readonly<
  Record<Exclude<keyof UpstreamShowtime, "id" | "type">, Kind>
> = {
  dateLocal: "string",
  expired: "boolean",
  isSoldOut: "boolean",
  ticketingJumpPageURL: "string",
};

const SALES_OFF = "disabled";

export const ON_SALE = "available";

const CHAINS: ReadonlyMap<string | undefined, Chain> = new Map([
  ["AFC", "Angelika Film Center"],
  ["ALAM", "Alamo Drafthouse Cinemas"],
  ["AMC", "AMC"],
  ["CNMK", "Cinemark Theatres"],
  ["CPLS", "Cinepolis"],
  ["GLXY", "Galaxy Theatres"],
  ["HOOK", "Hooky Entertainment"],
  ["L", "Landmark"],
  ["SMG", "Studio Movie Grill"],
]);

const AMENITIES: Readonly<Record<string, Amenity>> = {
  "Accessibility devices available": "Accessibility Devices",
  "Closed caption": "Closed Captioning",
  "Dine-In Delivery to Seat": "Dine-In",
  "Luxury Lounge Recliners": "Recliners",
  "Luxury Recliners": "Recliners",
  "Recliner Seats": "Recliners",
};

const FORMATS: Readonly<Record<string, Format>> = {
  "Cinemark XD": "XD",
  "D-Box": "D-BOX",
  DFX: "DFX",
  "Dolby Atmos": "Dolby Atmos",
  "Dolby Cinema @ AMC": "Dolby Cinema",
  "HDR By Barco": "HDR by Barco",
  IMAX: "IMAX",
  "IMAX with Laser": "IMAX with Laser",
  "Laser at AMC": "Laser",
  "Laser Projection": "Laser",
  "RealD 3D": "3D",
  SDX: "SDX",
  ScreenX: "ScreenX",
  "Sony Digital Cinema": "Sony Digital",
  "The Big Show": "The Big Show",
  XD: "XD",
  "XL at AMC": "XL",
};

const carries = (
  value: unknown,
  fields: Readonly<Record<string, Kind>>,
): value is Readonly<Record<string, unknown>> =>
  isRecord(value) &&
  Object.entries(fields).every(([field, kind]) => typeof value[field] === kind);

const isAmenity = (value: unknown): value is UpstreamAmenity =>
  carries(value, AMENITY_FIELDS);

const namesAChainOrNone = (value: Readonly<Record<string, unknown>>) =>
  value.chainCode === undefined || typeof value.chainCode === "string";

const isShowtime = (value: unknown): value is UpstreamShowtime =>
  carries(value, SHOWTIME_FIELDS) &&
  (value.id === undefined || typeof value.id === "number") &&
  (value.type === undefined || typeof value.type === "string");

const isAmenityGroup = (value: unknown): value is UpstreamAmenityGroup =>
  carries(value, GROUP_FIELDS) &&
  Array.isArray(value.amenities) &&
  value.amenities.every(isAmenity) &&
  Array.isArray(value.showtimes) &&
  value.showtimes.every(isShowtime);

const isVariant = (value: unknown): value is UpstreamVariant =>
  isRecord(value) &&
  Array.isArray(value.amenityGroups) &&
  value.amenityGroups.every(isAmenityGroup);

const isTheater = (value: unknown): value is UpstreamTheater =>
  carries(value, THEATER_FIELDS) &&
  namesAChainOrNone(value) &&
  Array.isArray(value.variants) &&
  value.variants.every(isVariant);

const carriesShowtimes = (
  value: unknown,
): value is {
  readonly theaterShowtimes: { readonly theaters: readonly UpstreamTheater[] };
} =>
  isRecord(value) &&
  isRecord(value.theaterShowtimes) &&
  Array.isArray(value.theaterShowtimes.theaters) &&
  value.theaterShowtimes.theaters.every(isTheater);

const carriesTheaters = (
  value: unknown,
): value is { readonly theaters: readonly UpstreamNamedTheater[] } =>
  isRecord(value) &&
  Array.isArray(value.theaters) &&
  value.theaters.every(
    (theater) => carries(theater, THEATER_FIELDS) && namesAChainOrNone(theater),
  );

const theaterOf = (upstream: UpstreamNamedTheater): Theater => {
  const named = { id: upstream.formattedID, name: upstream.name };
  const chain = CHAINS.get(upstream.chainCode);
  return chain === undefined ? named : { ...named, chain };
};

const labelled = <Named extends string>(
  labels: readonly UpstreamAmenity[],
  known: Readonly<Record<string, Named>>,
): readonly Named[] =>
  labels.flatMap((label) => known[label.name] ?? []).toSorted();

const presentationOf = (
  theater: UpstreamNamedTheater,
  group: UpstreamAmenityGroup,
): Presentation => ({
  movie: group.movieID,
  theater: theaterOf(theater),
  formats: labelled(group.amenities, FORMATS),
  amenities: labelled(group.amenities, AMENITIES),
});

const notBookable = (
  group: UpstreamAmenityGroup,
  row: UpstreamShowtime,
): UnbookableReason | null => {
  if (!group.hasReservedSeating) return "noSeatMap";
  if (row.expired) return "started";
  if (row.type === SALES_OFF) return "salesOff";
  if (row.isSoldOut) return "soldOut";
  return null;
};

const listingsOf = (theater: UpstreamTheater): readonly Listing[] =>
  theater.variants.flatMap((variant) =>
    variant.amenityGroups.flatMap((group) => {
      const presentation = presentationOf(theater, group);
      return group.showtimes.map((row) => {
        const listed = {
          startsAt: row.dateLocal,
          presentation,
          ticketing: row.ticketingJumpPageURL,
        };
        return {
          showtime: row.id === undefined ? listed : { ...listed, id: row.id },
          reason: notBookable(group, row),
          sellability: row.type,
        };
      });
    }),
  );

const catalogued = (listings: readonly Listing[]): Catalogue => {
  const bookable: Showtime[] = [];
  const unbookable: Unbookable[] = [];
  const unidentified: Unidentified[] = [];
  for (const { showtime, reason } of listings) {
    if (reason !== null) unbookable.push({ showtime, reason });
    else if (showtime.id === undefined) unidentified.push(showtime);
    else bookable.push(showtime);
  }
  return { bookable, unbookable, unidentified };
};

const listingsIn = (body: string): readonly Listing[] | null => {
  const answer = decoded(body);
  return answer !== null && carriesShowtimes(answer.value)
    ? answer.value.theaterShowtimes.theaters.flatMap(listingsOf)
    : null;
};

export const catalogueFrom = (body: string): Catalogue | null => {
  const listings = listingsIn(body);
  return listings === null ? null : catalogued(listings);
};

export const sellabilityFrom = (body: string): Sellability | null => {
  const listings = listingsIn(body);
  return listings === null
    ? null
    : {
        rows: listings.length,
        notRefused: listings.flatMap((listing) =>
          listing.reason === null ? [listing.sellability] : [],
        ),
      };
};

export const theatersFrom = (body: string): readonly Theater[] | null => {
  const answer = decoded(body);
  return answer === null || !carriesTheaters(answer.value)
    ? null
    : answer.value.theaters.map(theaterOf);
};
