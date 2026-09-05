import type { SearchTerms, SeatProfile } from "@seatscout/client";
import type { Terms } from "./terms.js";

export const askedFrom = (
  terms: Terms,
  profile: SeatProfile,
): SearchTerms | null =>
  terms.movie === undefined || terms.area === undefined
    ? null
    : {
        movie: terms.movie,
        date: terms.date,
        area: terms.area,
        partySize: terms.partySize,
        accessibleSeating: false,
        profile,
      };
