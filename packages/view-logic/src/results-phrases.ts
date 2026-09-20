import type { Coverage, SeatGroupResult, Snapshot } from "@seatscout/client";
import { accountOf, beingReadIn, unreachedIn } from "./derived.js";
import { clockOf, noneOf, spokenOf, wordOf } from "./phrases.js";
import type { Terms } from "./terms.js";

type Named = Coverage["soldOut"][number];

export const nameOf = (showtime: Named): string =>
  `${showtime.presentation.theater.name} · ${clockOf(showtime.startsAt)}`;

export const coverageOf = (snapshot: Snapshot): string => {
  if (snapshot.phase === "resolving") return "Reading the listing";
  if (snapshot.phase === "unreachable") return "Nothing was read";
  const account = accountOf(snapshot.coverage);
  const counts = `${account.candidates} candidates · ${account.checked} checked`;
  return account.remaining > 0
    ? `${counts} · ${account.remaining} to go`
    : counts;
};

export const LEDGER = "ledger ›";

export interface ListHead {
  readonly said: string;
  readonly count: string | null;
}

const showtimesIn = ({ results }: Snapshot): string =>
  `${results.length} ${results.length === 1 ? "showtime" : "showtimes"}`;

export const headOf = (snapshot: Snapshot, tie: boolean): ListHead => {
  if (snapshot.phase !== "settled")
    return {
      said: `Reading ${beingReadIn(snapshot)} seat maps`,
      count: `${showtimesIn(snapshot)} so far`,
    };
  if (unreachedIn(snapshot) > 0)
    return {
      said: `From the ${accountOf(snapshot.coverage).checked} rooms that answered`,
      count: null,
    };
  return {
    said: tie ? "The top of the list is a tie" : "Best seats first",
    count: showtimesIn(snapshot),
  };
};

export const tiedOf = (tied: number): string => `${tied} tied`;

export const BELOW_THE_TIE = "below: measurably further";

export const ONE_SOURCE = "1 source";

export const cardNameOf = (result: SeatGroupResult): string =>
  [
    result.showtime.presentation.theater.name,
    clockOf(result.showtime.startsAt),
    ...result.showtime.presentation.formats,
  ].join(", ");

export const roomNameOf = (result: SeatGroupResult): string =>
  `See ${spokenOf(result)} in the room at ${result.showtime.presentation.theater.name}, ${clockOf(result.showtime.startsAt)}`;

export const notBookableOf = (result: SeatGroupResult): string | null =>
  result.removed.unavailable > 0
    ? `${result.removed.unavailable} of ${result.seatCount} not bookable`
    : null;

export const designationsOf = (result: SeatGroupResult): string | null =>
  result.seats.some((seat) => seat.designation !== "standard")
    ? result.seats.map((seat) => `${seat.id} ${seat.designation}`).join(" · ")
    : null;

export const UNREADABLE = "The listing could not be read.";

export const notAnAnswerAbout = (when: string): string =>
  `Nothing was looked at, so this is not an answer about ${when}.`;

export const RETRY_THE_SEARCH = "Retry the search";

export const retryOf = (unreached: number): string =>
  `Retry the ${wordOf(unreached)} unreached`;

export const WAITING_TO_RETRY = "Waiting for a connection to retry";

export const WIDEN = "Widen instead: change the query";

export const CHANGE_THE_QUERY = "Change the query";

export const UNREACHED = "Could not be reached";

export const partialOf = (snapshot: Snapshot): string =>
  snapshot.results.length === 0
    ? `Nothing yet, out of the ${accountOf(snapshot.coverage).checked} rooms that answered.`
    : "Not everywhere yet.";

export interface Tally {
  readonly figure: number;
  readonly word: string;
  readonly unreached: boolean;
}

export const talliesOf = (snapshot: Snapshot): readonly Tally[] => {
  const account = accountOf(snapshot.coverage);
  return [
    { figure: account.candidates, word: "candidates", unreached: false },
    { figure: account.checked, word: "answered", unreached: false },
    { figure: unreachedIn(snapshot), word: "unreached", unreached: true },
  ];
};

export interface Verdict {
  readonly said: string;
  readonly ledes: readonly string[];
}

export const emptyOf = (
  snapshot: Snapshot,
  terms: Terms,
  when: string,
): Verdict =>
  snapshot.coverage.candidates === 0
    ? {
        said: `No showtime matches this query ${when}.`,
        ledes: [
          `Nothing listed near ${terms.area} carries every term at once, so nothing was checked. Fewer terms would change it.`,
        ],
      }
    : {
        said: `${noneOf(terms.partySize)}, anywhere ${when}.`,
        ledes: [
          `Every one of the ${snapshot.coverage.candidates} candidates has an answer, and none of them can seat ${terms.partySize} of you in one unbroken run.`,
          "Fewer seats together, another day or a wider area would change it.",
        ],
      };
