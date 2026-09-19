import { parametersOf, type Terms, termsFrom } from "@seatscout/view-logic";
import { router, useLocalSearchParams } from "expo-router";

type Given = Readonly<Record<string, string | readonly string[] | undefined>>;

const paired = (name: string, value: string): [string, string] => [name, value];

export const pairsOf = (given: Given): readonly [string, string][] =>
  Object.entries(given).flatMap(([name, value]) =>
    typeof value === "string"
      ? [paired(name, value)]
      : (value ?? []).map((one) => paired(name, one)),
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

export const goTo = (terms: Terms): void => {
  router.push({ pathname: "/", params: askedIn(terms) });
};
