import type { SearchTerms } from "@seatscout/client";
import type { Terms } from "./terms.js";

export const askedFrom = (terms: Terms): SearchTerms | null =>
  terms.movie === undefined || terms.area === undefined
    ? null
    : {
        movie: terms.movie,
        date: terms.date,
        area: terms.area,
        partySize: terms.partySize,
        accessibleSeating: false,
      };
