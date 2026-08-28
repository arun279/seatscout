import type { TicketingUrl } from "@seatscout/core";
import { type CatalogueDependencies, openCatalogue } from "./catalogue.js";
import { type SeatGroupResult, rankingIn, resultOf } from "./ranking.js";
import type { SearchTerms } from "./search.js";

type Gone = "taken" | "unreachable";

export type Verified =
  | {
      readonly ok: true;
      readonly result: SeatGroupResult;
      readonly ticketing: TicketingUrl;
    }
  | {
      readonly ok: false;
      readonly reason: Gone;
      readonly alternatives: readonly SeatGroupResult[];
    };

const gone = (
  reason: Gone,
  alternatives: readonly SeatGroupResult[] = [],
): Verified => ({ ok: false, reason, alternatives });

export const openVerification = (deps: CatalogueDependencies) => {
  const resolve = openCatalogue(deps);

  return async (
    result: SeatGroupResult,
    terms: SearchTerms,
  ): Promise<Verified> => {
    const listing = await resolve(terms);
    if (!listing.ok) return gone("unreachable");
    const showtime = listing.payload.bookable.find(
      (candidate) => candidate.id === result.showtime.id,
    );
    if (showtime === undefined) return gone("taken");
    const reading = await deps.source.seatsFor(`${showtime.id}`);
    if (!reading.ok)
      return gone(reading.reason === "unreachable" ? "unreachable" : "taken");
    const ranking = rankingIn(reading.payload, terms);
    const held = ranking.holding(result);
    return held === null
      ? gone(
          "taken",
          ranking.offered.map((alternative) =>
            resultOf(showtime, reading, alternative, terms),
          ),
        )
      : {
          ok: true,
          result: resultOf(showtime, reading, held, terms),
          ticketing: showtime.ticketing,
        };
  };
};
