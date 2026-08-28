import type {
  Catalogue,
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
} from "../domain/catalogue.js";
import { decoded, isRecord } from "./json.js";

interface UpstreamNamedTheater {
  readonly formattedID: TheaterId;
  readonly name: string;
}

interface UpstreamAmenity {
  readonly name: string;
}

interface UpstreamShowtime {
  readonly id: ShowtimeId;
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
  readonly showtime: Showtime;
  readonly reason: UnbookableReason | null;
}

type Kind = "boolean" | "number" | "string";

const THEATER_FIELDS: Readonly<Record<keyof UpstreamNamedTheater, Kind>> = {
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

const SHOWTIME_FIELDS: Readonly<Record<keyof UpstreamShowtime, Kind>> = {
  dateLocal: "string",
  expired: "boolean",
  id: "number",
  isSoldOut: "boolean",
  ticketingJumpPageURL: "string",
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

const isShowtime = (value: unknown): value is UpstreamShowtime =>
  carries(value, SHOWTIME_FIELDS);

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
  value.theaters.every((theater) => carries(theater, THEATER_FIELDS));

const theaterOf = (upstream: UpstreamNamedTheater): Theater => ({
  id: upstream.formattedID,
  name: upstream.name,
});

const presentationOf = (
  theater: UpstreamNamedTheater,
  group: UpstreamAmenityGroup,
): Presentation => ({
  movie: group.movieID,
  theater: theaterOf(theater),
  formats: group.amenities
    .flatMap((amenity) => FORMATS[amenity.name] ?? [])
    .toSorted(),
});

const notBookable = (
  group: UpstreamAmenityGroup,
  row: UpstreamShowtime,
): UnbookableReason | null => {
  if (!group.hasReservedSeating) return "noSeatMap";
  if (row.expired) return "started";
  if (row.isSoldOut) return "soldOut";
  return null;
};

const listingsOf = (theater: UpstreamTheater): readonly Listing[] =>
  theater.variants.flatMap((variant) =>
    variant.amenityGroups.flatMap((group) => {
      const presentation = presentationOf(theater, group);
      return group.showtimes.map((row) => ({
        showtime: {
          id: row.id,
          startsAt: row.dateLocal,
          presentation,
          ticketing: row.ticketingJumpPageURL,
        },
        reason: notBookable(group, row),
      }));
    }),
  );

const catalogued = (theaters: readonly UpstreamTheater[]): Catalogue => {
  const bookable: Showtime[] = [];
  const unbookable: Unbookable[] = [];
  for (const theater of theaters)
    for (const { showtime, reason } of listingsOf(theater)) {
      if (reason === null) bookable.push(showtime);
      else unbookable.push({ showtime, reason });
    }
  return { bookable, unbookable, unidentified: [] };
};

export const catalogueFrom = (body: string): Catalogue | null => {
  const answer = decoded(body);
  return answer === null || !carriesShowtimes(answer.value)
    ? null
    : catalogued(answer.value.theaterShowtimes.theaters);
};

export const theatersFrom = (body: string): readonly Theater[] | null => {
  const answer = decoded(body);
  return answer === null || !carriesTheaters(answer.value)
    ? null
    : answer.value.theaters.map(theaterOf);
};
