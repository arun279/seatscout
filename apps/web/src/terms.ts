import {
  type Amenity,
  type Chain,
  EVERY_AMENITY,
  EVERY_CHAIN,
  EVERY_FORMAT,
  type Format,
  type SearchTerms,
} from "@seatscout/client";

export interface Terms {
  readonly movie?: string;
  readonly date: string;
  readonly area?: string;
  readonly partySize: number;
  readonly accessibleSeating?: boolean;
  readonly chains?: readonly Chain[];
  readonly theaters?: readonly string[];
  readonly formats?: readonly Format[];
  readonly amenities?: readonly Amenity[];
  readonly from?: string;
  readonly until?: string;
}

interface RawTerms {
  readonly movie?: string | null;
  readonly date?: string | null;
  readonly area?: string | null;
  readonly partySize?: string | number | null;
  readonly accessibleSeating?: boolean | string | null;
  readonly chains?: readonly string[];
  readonly theaters?: readonly string[];
  readonly formats?: readonly string[];
  readonly amenities?: readonly string[];
  readonly from?: string | null;
  readonly until?: string | null;
}

type Narrowing = Pick<
  Terms,
  "chains" | "theaters" | "formats" | "amenities" | "from" | "until"
>;

const LISTING_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DEFAULT_PARTY_SIZE = 2;

const given = (value: string | null | undefined) => value?.trim() ?? "";

const partySizeOf = (value: string | number | null | undefined) => {
  const partySize = Number(value);
  return Number.isInteger(partySize) && partySize >= 1
    ? partySize
    : DEFAULT_PARTY_SIZE;
};

const among =
  <Named extends string>(every: readonly Named[]) =>
  (value: string): value is Named =>
    every.some((named) => named === value);

const anyOf = <Named extends string>(
  asked: readonly Named[],
): readonly Named[] | undefined => (asked.length > 0 ? asked : undefined);

const namedIn = <Named extends string>(
  asked: readonly string[] | undefined,
  every: readonly Named[],
) => anyOf((asked ?? []).filter(among(every)));

const clockOf = (value: string | null | undefined) => {
  const clock = given(value);
  return CLOCK.test(clock) ? clock : undefined;
};

const identityOf = (raw: RawTerms, today: string) => {
  const movie = given(raw.movie);
  const date = given(raw.date);
  const area = given(raw.area);
  return {
    ...(movie && { movie }),
    date: LISTING_DATE.test(date) ? date : today,
    ...(area && { area }),
    partySize: partySizeOf(raw.partySize),
  };
};

const askedFor = (raw: RawTerms) => {
  const chains = namedIn(raw.chains, EVERY_CHAIN);
  const theaters = anyOf((raw.theaters ?? []).map(given).filter(Boolean));
  const formats = namedIn(raw.formats, EVERY_FORMAT);
  const amenities = namedIn(raw.amenities, EVERY_AMENITY);
  return {
    ...(chains && { chains }),
    ...(theaters && { theaters }),
    ...(formats && { formats }),
    ...(amenities && { amenities }),
  };
};

const seatingOf = (raw: RawTerms) => {
  const from = clockOf(raw.from);
  const until = clockOf(raw.until);
  const accessibleSeating =
    raw.accessibleSeating === true || raw.accessibleSeating === "true";
  return {
    ...(from && { from }),
    ...(until && { until }),
    ...(accessibleSeating && { accessibleSeating }),
  };
};

export const termsOf = (raw: RawTerms, today: string): Terms => ({
  ...identityOf(raw, today),
  ...askedFor(raw),
  ...seatingOf(raw),
});

export const termsFrom = (query: string, today: string): Terms => {
  const params = new URLSearchParams(query);
  return termsOf(
    {
      movie: params.get("movie"),
      date: params.get("date"),
      area: params.get("area"),
      partySize: params.get("partySize"),
      accessibleSeating: params.get("accessibleSeating"),
      chains: params.getAll("chain"),
      theaters: params.getAll("theater"),
      formats: params.getAll("format"),
      amenities: params.getAll("amenity"),
      from: params.get("from"),
      until: params.get("until"),
    },
    today,
  );
};

const LISTS: readonly (readonly [
  string,
  (terms: Terms) => readonly string[] | undefined,
])[] = [
  ["chain", (terms) => terms.chains],
  ["theater", (terms) => terms.theaters],
  ["format", (terms) => terms.formats],
  ["amenity", (terms) => terms.amenities],
];

export const queryOf = (terms: Terms): string => {
  const params = new URLSearchParams();
  if (terms.movie !== undefined) params.set("movie", terms.movie);
  params.set("date", terms.date);
  if (terms.area !== undefined) params.set("area", terms.area);
  params.set("partySize", `${terms.partySize}`);
  for (const [key, listOf] of LISTS)
    for (const value of listOf(terms) ?? []) params.append(key, value);
  if (terms.from !== undefined) params.set("from", terms.from);
  if (terms.until !== undefined) params.set("until", terms.until);
  if (terms.accessibleSeating === true) params.set("accessibleSeating", "true");
  return `?${params}`;
};

const narrowingOf = (terms: Terms): Narrowing => ({
  ...(terms.chains && { chains: terms.chains }),
  ...(terms.theaters && { theaters: terms.theaters }),
  ...(terms.formats && { formats: terms.formats }),
  ...(terms.amenities && { amenities: terms.amenities }),
  ...(terms.from && { from: `${terms.date}T${terms.from}` }),
  ...(terms.until && { until: `${terms.date}T${terms.until}` }),
});

export const searchTermsOf = (terms: Terms): SearchTerms | null =>
  terms.movie === undefined || terms.area === undefined
    ? null
    : {
        movie: terms.movie,
        date: terms.date,
        area: terms.area,
        partySize: terms.partySize,
        accessibleSeating: terms.accessibleSeating === true,
        ...narrowingOf(terms),
      };
