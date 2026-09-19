import type { SearchTerms, SeatProfile } from "@seatscout/client";
import type { Terms } from "./terms.js";

type Narrowing = Pick<
  Terms,
  "chains" | "theaters" | "formats" | "amenities" | "from" | "until"
>;

const narrowingOf = (terms: Terms): Narrowing => ({
  ...(terms.chains && { chains: terms.chains }),
  ...(terms.theaters && { theaters: terms.theaters }),
  ...(terms.formats && { formats: terms.formats }),
  ...(terms.amenities && { amenities: terms.amenities }),
  ...(terms.from && { from: `${terms.date}T${terms.from}` }),
  ...(terms.until && { until: `${terms.date}T${terms.until}` }),
});

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
        accessibleSeating: terms.accessibleSeating === true,
        profile,
        ...narrowingOf(terms),
      };
