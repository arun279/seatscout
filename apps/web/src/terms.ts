import { parametersOf, type Terms, termsFrom } from "@seatscout/view-logic";

export const termsIn = (query: string, today: string): Terms =>
  termsFrom([...new URLSearchParams(query)], today);

export const queryOf = (terms: Terms): string =>
  `?${new URLSearchParams([...parametersOf(terms)])}`;
