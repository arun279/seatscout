import {
  type Coverage,
  type Day,
  SEAT_MAP_BUDGET,
  type SeatGroupResult,
  type Snapshot,
} from "@seatscout/client";
import {
  accountOf,
  beingReadIn,
  toGoIn,
  unreachedIn,
  unreadIn,
} from "./derived.js";
import { clockOf, noneOf, spokenOf, wordOf } from "./phrases.js";
import { dayOf, whenOf } from "./when-phrases.js";
import type { Terms } from "./terms.js";

type Named = Coverage["soldOut"][number];

export const nameOf = (showtime: Named): string =>
  `${showtime.presentation.theater.name} · ${clockOf(showtime.startsAt)}`;

const REFUSED = "the source refused, so the search stopped";

const countsOf = (snapshot: Snapshot): string => {
  const account = accountOf(snapshot.coverage);
  const unread = unreadIn(snapshot);
  const toGo = toGoIn(snapshot);
  return [
    `${account.candidates} candidates`,
    `${account.checked} checked`,
    ...(toGo > 0 ? [`${toGo} to go`] : []),
    ...(unread > 0 ? [`${unread} not read yet`] : []),
    ...(snapshot.refused ? [REFUSED] : []),
  ].join(" · ");
};

export const coverageOf = (snapshot: Snapshot): string => {
  if (snapshot.phase === "resolving") return "Reading the listing";
  if (snapshot.phase === "unreachable")
    return snapshot.refused
      ? `Nothing was read: ${REFUSED}`
      : "Nothing was read";
  return countsOf(snapshot);
};

export const dayCoverageOf = (day: Day, today: string): string => {
  const counts = [
    ...(day.read > 0 ? [`${day.read} read`] : []),
    ...(day.reading > 0 ? [`${day.reading} being read`] : []),
    ...(day.unread > 0 ? [`${day.unread} not read yet`] : []),
  ];
  return `${dayOf(day.date, today)}: ${counts.length > 0 ? counts.join(" · ") : "no seat map to read"}`;
};

export const readMoreOf = (
  snapshot: Snapshot,
  today: string,
): string | null => {
  if (snapshot.phase !== "settled" || snapshot.refused) return null;
  const next = snapshot.days
    .filter((day) => day.unread > 0)
    .reduce<{ readonly count: number; readonly dates: readonly string[] }>(
      (taken, day) =>
        taken.count < SEAT_MAP_BUDGET
          ? {
              count: Math.min(SEAT_MAP_BUDGET, taken.count + day.unread),
              dates: [...taken.dates, day.date],
            }
          : taken,
      { count: 0, dates: [] },
    );
  return next.dates.length === 0
    ? null
    : `Read ${next.count} more rooms ${next.dates.map((date) => whenOf(date, today)).join(" and ")}`;
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
  snapshot.coverage.checked === 0
    ? {
        said: `No showtime matches this query ${when}.`,
        ledes: [
          `Nothing listed near ${terms.area} that is still to come carries every term at once, so nothing was checked. Fewer terms or another day would change it.`,
        ],
      }
    : {
        said: `${noneOf(terms.partySize)}, anywhere ${when}.`,
        ledes: [
          `Every one of the ${snapshot.coverage.candidates} candidates has an answer, and none of them can seat ${terms.partySize} of you in one unbroken run.`,
          "Fewer seats together, another day or a wider area would change it.",
        ],
      };
