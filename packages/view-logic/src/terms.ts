import {
  type Amenity,
  type Chain,
  EVERY_AMENITY,
  EVERY_CHAIN,
  EVERY_FORMAT,
  type Format,
  type TheaterId,
} from "@seatscout/client";
import { spanOf, valuesOf, type When, whenValuesOf } from "./when.js";

export type Parameter = [name: string, value: string];

export interface Terms {
  readonly movie?: string;
  readonly date: string;
  readonly when?: When;
  readonly area?: string;
  readonly partySize: number;
  readonly accessibleSeating?: boolean;
  readonly chains?: readonly Chain[];
  readonly theaters?: readonly TheaterId[];
  readonly formats?: readonly Format[];
  readonly amenities?: readonly Amenity[];
  readonly from?: string;
  readonly until?: string;
}

export interface RawTerms {
  readonly movie?: string | undefined;
  readonly date?: string | readonly string[] | undefined;
  readonly when?: When | undefined;
  readonly area?: string | undefined;
  readonly partySize?: string | number | undefined;
  readonly accessibleSeating?: boolean | string | undefined;
  readonly chains?: readonly string[];
  readonly theaters?: readonly string[];
  readonly formats?: readonly string[];
  readonly amenities?: readonly string[];
  readonly from?: string | undefined;
  readonly until?: string | undefined;
}

const CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DEFAULT_PARTY_SIZE = 2;

const given = (value: string | undefined) => value?.trim() ?? "";

const isTheaterId = (raw: string): raw is TheaterId => raw.length > 0;

const partySizeOf = (value: string | number | undefined) => {
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
): readonly Named[] | undefined => {
  const once = [...new Set(asked)];
  return once.length > 0 ? once : undefined;
};

const namedIn = <Named extends string>(
  asked: readonly string[] | undefined,
  every: readonly Named[],
) => (asked === undefined ? undefined : anyOf(asked.filter(among(every))));

const clockOf = (value: string | undefined) => {
  const clock = given(value);
  return CLOCK.test(clock) ? clock : undefined;
};

const datesOf = ({ date, when }: RawTerms) =>
  when === undefined ? [date].flat().map(given) : whenValuesOf(when);

const identityOf = (raw: RawTerms, today: string) => {
  const movie = given(raw.movie);
  const area = given(raw.area);
  return {
    ...(movie && { movie }),
    ...spanOf(datesOf(raw), today),
    ...(area && { area }),
    partySize: partySizeOf(raw.partySize),
  };
};

const askedFor = (raw: RawTerms) => {
  const chains = namedIn(raw.chains, EVERY_CHAIN);
  const theaters = anyOf((raw.theaters ?? []).map(given).filter(isTheaterId));
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

const valuesIn = (parameters: readonly Parameter[], name: string) =>
  parameters.filter(([named]) => named === name).map(([, value]) => value);

const valueIn = (parameters: readonly Parameter[], name: string) =>
  valuesIn(parameters, name)[0];

export const termsFrom = (
  parameters: readonly Parameter[],
  today: string,
): Terms =>
  termsOf(
    {
      movie: valueIn(parameters, "movie"),
      date: valuesIn(parameters, "date"),
      area: valueIn(parameters, "area"),
      partySize: valueIn(parameters, "partySize"),
      accessibleSeating: valueIn(parameters, "accessibleSeating"),
      chains: valuesIn(parameters, "chain"),
      theaters: valuesIn(parameters, "theater"),
      formats: valuesIn(parameters, "format"),
      amenities: valuesIn(parameters, "amenity"),
      from: valueIn(parameters, "from"),
      until: valueIn(parameters, "until"),
    },
    today,
  );

const LISTS: readonly (readonly [
  string,
  (terms: Terms) => readonly string[] | undefined,
])[] = [
  ["chain", (terms) => terms.chains],
  ["theater", (terms) => terms.theaters],
  ["format", (terms) => terms.formats],
  ["amenity", (terms) => terms.amenities],
];

export const windowIn = (
  terms: Terms,
): { readonly from: string; readonly until: string } => ({
  from: terms.from ?? "",
  until: terms.until ?? "",
});

export const parametersOf = (terms: Terms): readonly Parameter[] => {
  const parameters: Parameter[] = [];
  if (terms.movie !== undefined) parameters.push(["movie", terms.movie]);
  for (const date of valuesOf(terms)) parameters.push(["date", date]);
  if (terms.area !== undefined) parameters.push(["area", terms.area]);
  parameters.push(["partySize", `${terms.partySize}`]);
  for (const [name, listOf] of LISTS)
    for (const value of listOf(terms) ?? []) parameters.push([name, value]);
  if (terms.from !== undefined) parameters.push(["from", terms.from]);
  if (terms.until !== undefined) parameters.push(["until", terms.until]);
  if (terms.accessibleSeating === true)
    parameters.push(["accessibleSeating", "true"]);
  return parameters;
};
