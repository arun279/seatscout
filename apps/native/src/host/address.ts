import type { SeatGroupResult } from "@seatscout/client";
import {
  parametersOf,
  type Term,
  type Terms,
  termsFrom,
} from "@seatscout/view-logic";
import { router, useLocalSearchParams } from "expo-router";

const FOCUSED: readonly Term[] = ["area", "movie"];

type Given = Readonly<Record<string, string | readonly string[] | undefined>>;

const LISTS: readonly string[] = [
  "date",
  "chain",
  "theater",
  "format",
  "amenity",
];

const valuesOf = (name: string, value: string) =>
  LISTS.includes(name) ? value.split(",") : [value];

const paired = (name: string, value: string): [string, string][] =>
  valuesOf(name, value).map((one) => [name, one]);

export const pairsOf = (given: Given): readonly [string, string][] =>
  Object.entries(given).flatMap(([name, value]) =>
    typeof value === "string"
      ? paired(name, value)
      : (value ?? []).flatMap((one) => paired(name, one)),
  );

export const askedIn = (
  terms: Terms,
): Readonly<Record<string, string | string[]>> => {
  const asked: Record<string, string | string[]> = {};
  for (const [name, value] of parametersOf(terms)) {
    const held = asked[name];
    if (held === undefined) asked[name] = value;
    else asked[name] = Array.isArray(held) ? [...held, value] : [held, value];
  }
  return asked;
};

export const useTerms = (today: string): Terms =>
  termsFrom(pairsOf(useLocalSearchParams()), today);

export const useFocus = (): Term | undefined => {
  const term = useLocalSearchParams()["term"];
  return FOCUSED.find((named) => named === term);
};

export const goTo = (terms: Terms): void => {
  router.push({ pathname: "/", params: askedIn(terms) });
};

export const askAbout = (terms: Terms, term: Term): void => {
  router.push({ pathname: "/ask", params: { ...askedIn(terms), term } });
};

export const openRoom = (
  terms: Terms,
  showtime: number,
  group: string,
): void => {
  router.push({
    pathname: "/room",
    params: { ...askedIn(terms), showtime: `${showtime}`, group },
  });
};

export const openLedger = (terms: Terms): void => {
  router.push({ pathname: "/ledger", params: askedIn(terms) });
};

let handed: SeatGroupResult | undefined;

export const handOff = (chosen: SeatGroupResult): void => {
  handed = chosen;
  router.push({ pathname: "/hand-off", params: { group: chosen.key } });
};

export const useHanded = (): SeatGroupResult | undefined => {
  const { group } = useLocalSearchParams();
  return handed?.key === group ? handed : undefined;
};

export const runInstead = (terms: Terms): void => {
  router.replace({ pathname: "/", params: askedIn(terms) });
};

export const keepAsItWas = (): void => {
  router.back();
};
