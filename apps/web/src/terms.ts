import type { SearchTerms } from "@seatscout/client";

export interface Terms {
  readonly movie?: string;
  readonly date: string;
  readonly area?: string;
  readonly partySize: number;
}

const LISTING_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_PARTY_SIZE = 2;

const given = (value: string | null | undefined) => value?.trim() ?? "";

const partySizeOf = (value: string | number | null | undefined) => {
  const partySize = Number(value);
  return Number.isInteger(partySize) && partySize >= 1
    ? partySize
    : DEFAULT_PARTY_SIZE;
};

export const termsOf = (
  raw: {
    readonly movie?: string | null;
    readonly date?: string | null;
    readonly area?: string | null;
    readonly partySize?: string | number | null;
  },
  today: string,
): Terms => {
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

export const termsFrom = (query: string, today: string): Terms => {
  const params = new URLSearchParams(query);
  return termsOf(
    {
      movie: params.get("movie"),
      date: params.get("date"),
      area: params.get("area"),
      partySize: params.get("partySize"),
    },
    today,
  );
};

export const queryOf = (terms: Terms): string => {
  const params = new URLSearchParams();
  if (terms.movie !== undefined) params.set("movie", terms.movie);
  params.set("date", terms.date);
  if (terms.area !== undefined) params.set("area", terms.area);
  params.set("partySize", `${terms.partySize}`);
  return `?${params}`;
};

export const searchTermsOf = (terms: Terms): SearchTerms | null =>
  terms.movie === undefined || terms.area === undefined
    ? null
    : {
        movie: terms.movie,
        date: terms.date,
        area: terms.area,
        partySize: terms.partySize,
        accessibleSeating: false,
      };
